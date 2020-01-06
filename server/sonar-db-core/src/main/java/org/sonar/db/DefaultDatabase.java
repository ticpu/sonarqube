/*
 * SonarQube
 * Copyright (C) 2009-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.db;

import ch.qos.logback.classic.Level;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableMap;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import javax.sql.DataSource;
import org.apache.commons.dbcp2.BasicDataSource;
import org.apache.commons.dbcp2.BasicDataSourceFactory;
import org.apache.commons.dbutils.DbUtils;
import org.apache.commons.lang.StringUtils;
import org.sonar.api.config.Settings;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.db.dialect.Dialect;
import org.sonar.db.dialect.DialectUtils;
import org.sonar.db.profiling.NullConnectionInterceptor;
import org.sonar.db.profiling.ProfiledConnectionInterceptor;
import org.sonar.db.profiling.ProfiledDataSource;
import org.sonar.process.logging.LogbackHelper;

import static com.google.common.base.Preconditions.checkState;
import static java.lang.String.format;
import static org.sonar.process.ProcessProperties.Property.JDBC_URL;

/**
 * @since 2.12
 */
public class DefaultDatabase implements Database {

  private static final Logger LOG = Loggers.get(Database.class);

  private static final String DEFAULT_URL = "jdbc:h2:tcp://localhost/sonar";
  private static final String SONAR_JDBC = "sonar.jdbc.";
  private static final String SONAR_JDBC_DIALECT = "sonar.jdbc.dialect";
  private static final String SONAR_JDBC_DRIVER = "sonar.jdbc.driverClassName";
  private static final String SONAR_JDBC_MAX_ACTIVE = "sonar.jdbc.maxActive";
  private static final String DBCP_JDBC_MAX_ACTIVE = "maxTotal";
  private static final String SONAR_JDBC_MAX_WAIT = "sonar.jdbc.maxWait";
  private static final String DBCP_JDBC_MAX_WAIT = "maxWaitMillis";
  private static final Map<String, String> SONAR_JDBC_TO_DBCP_PROPERTY_MAPPINGS = ImmutableMap.of(
    SONAR_JDBC_MAX_ACTIVE, DBCP_JDBC_MAX_ACTIVE,
    SONAR_JDBC_MAX_WAIT, DBCP_JDBC_MAX_WAIT);

  private final LogbackHelper logbackHelper;
  private final Settings settings;
  private ProfiledDataSource datasource;
  private Dialect dialect;
  private Properties properties;

  public DefaultDatabase(LogbackHelper logbackHelper, Settings settings) {
    this.logbackHelper = logbackHelper;
    this.settings = settings;
  }

  @Override
  public void start() {
    initSettings();
    try {
      initDataSource();
      checkConnection();

    } catch (Exception e) {
      throw new IllegalStateException("Fail to connect to database", e);
    }
  }

  @VisibleForTesting
  void initSettings() {
    properties = new Properties();
    completeProperties(settings, properties, SONAR_JDBC);
    completeDefaultProperty(properties, JDBC_URL.getKey(), DEFAULT_URL);
    doCompleteProperties(properties);

    String jdbcUrl = properties.getProperty(JDBC_URL.getKey());
    dialect = DialectUtils.find(properties.getProperty(SONAR_JDBC_DIALECT), jdbcUrl);
    properties.setProperty(SONAR_JDBC_DRIVER, dialect.getDefaultDriverClassName());
  }

  private void initDataSource() throws Exception {
    // but it's correctly caught by start()
    LOG.info("Create JDBC data source for {}", properties.getProperty(JDBC_URL.getKey()), DEFAULT_URL);
    BasicDataSource basicDataSource = BasicDataSourceFactory.createDataSource(extractCommonsDbcpProperties(properties));
    datasource = new ProfiledDataSource(basicDataSource, NullConnectionInterceptor.INSTANCE);
    datasource.setConnectionInitSqls(dialect.getConnectionInitStatements());
    datasource.setValidationQuery(dialect.getValidationQuery());
    enableSqlLogging(datasource, logbackHelper.getLoggerLevel("sql") == Level.TRACE);
  }

  private void checkConnection() {
    Connection connection = null;
    try {
      connection = datasource.getConnection();
      dialect.init(connection.getMetaData());
    } catch (SQLException e) {
      throw new IllegalStateException("Can not connect to database. Please check connectivity and settings (see the properties prefixed by 'sonar.jdbc.').", e);
    } finally {
      DbUtils.closeQuietly(connection);
    }
  }

  @Override
  public void stop() {
    if (datasource != null) {
      try {
        datasource.close();
      } catch (SQLException e) {
        throw new IllegalStateException("Fail to stop JDBC connection pool", e);
      }
    }
  }

  @Override
  public final Dialect getDialect() {
    return dialect;
  }

  @Override
  public final DataSource getDataSource() {
    return datasource;
  }

  public final Properties getProperties() {
    return properties;
  }

  @Override
  public void enableSqlLogging(boolean enable) {
    enableSqlLogging(datasource, enable);
  }

  private static void enableSqlLogging(ProfiledDataSource ds, boolean enable) {
    ds.setConnectionInterceptor(enable ? ProfiledConnectionInterceptor.INSTANCE : NullConnectionInterceptor.INSTANCE);
  }

  /**
   * Override this method to add JDBC properties at runtime
   */
  protected void doCompleteProperties(Properties properties) {
    // open-close principle
  }

  private static void completeProperties(Settings settings, Properties properties, String prefix) {
    List<String> jdbcKeys = settings.getKeysStartingWith(prefix);
    for (String jdbcKey : jdbcKeys) {
      String value = settings.getString(jdbcKey);
      properties.setProperty(jdbcKey, value);
    }
  }

  @VisibleForTesting
  static Properties extractCommonsDbcpProperties(Properties properties) {
    Properties result = new Properties();
    result.setProperty("accessToUnderlyingConnectionAllowed", "true");
    for (Map.Entry<Object, Object> entry : properties.entrySet()) {
      String key = (String) entry.getKey();
      if (StringUtils.startsWith(key, SONAR_JDBC)) {
        String resolvedKey = toDbcpPropertyKey(key);
        String existingValue = (String) result.setProperty(resolvedKey, (String) entry.getValue());
        checkState(existingValue == null || existingValue.equals(entry.getValue()),
          "Duplicate property declaration for resolved jdbc key '%s': conflicting values are '%s' and '%s'", resolvedKey, existingValue, entry.getValue());
        result.setProperty(toDbcpPropertyKey(key), (String) entry.getValue());
      }
    }
    return result;
  }

  private static void completeDefaultProperty(Properties props, String key, String defaultValue) {
    if (props.getProperty(key) == null) {
      props.setProperty(key, defaultValue);
    }
  }

  private static String toDbcpPropertyKey(String key) {
    if (SONAR_JDBC_TO_DBCP_PROPERTY_MAPPINGS.containsKey(key)) {
      return SONAR_JDBC_TO_DBCP_PROPERTY_MAPPINGS.get(key);
    }

    return StringUtils.removeStart(key, SONAR_JDBC);
  }

  @Override
  public String toString() {
    return format("Database[%s]", properties != null ? properties.getProperty(JDBC_URL.getKey()) : "?");
  }
}
