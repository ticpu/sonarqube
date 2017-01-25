/*
 * SonarQube
 * Copyright (C) 2009-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.server.startup;

import java.util.Date;
import java.util.Optional;
import javax.annotation.Nullable;
import org.sonar.api.security.DefaultGroups;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.api.utils.log.Profiler;
import org.sonar.api.web.UserRole;
import org.sonar.db.DbClient;
import org.sonar.db.DbSession;
import org.sonar.db.organization.DefaultTemplates;
import org.sonar.db.permission.template.PermissionTemplateDto;
import org.sonar.db.user.GroupDto;
import org.sonar.server.organization.DefaultOrganizationProvider;

public class RegisterPermissionTemplates {

  private static final Logger LOG = Loggers.get(RegisterPermissionTemplates.class);
  private static final String DEFAULT_TEMPLATE_UUID = "default_template";

  private final DbClient dbClient;
  private final DefaultOrganizationProvider defaultOrganizationProvider;

  public RegisterPermissionTemplates(DbClient dbClient, DefaultOrganizationProvider defaultOrganizationProvider) {
    this.dbClient = dbClient;
    this.defaultOrganizationProvider = defaultOrganizationProvider;
  }

  public void start() {
    Profiler profiler = Profiler.create(Loggers.get(getClass())).startInfo("Register permission templates");

    try (DbSession dbSession = dbClient.openSession(false)) {
      String defaultOrganizationUuid = defaultOrganizationProvider.get().getUuid();
      Optional<DefaultTemplates> defaultTemplates = dbClient.organizationDao().getDefaultTemplates(dbSession, defaultOrganizationUuid);
      if (!defaultTemplates.isPresent()) {
        PermissionTemplateDto defaultTemplate = getOrInsertDefaultTemplate(dbSession, defaultOrganizationUuid);
        dbClient.organizationDao().setDefaultTemplates(dbSession, defaultOrganizationUuid, new DefaultTemplates().setProjectUuid(defaultTemplate.getUuid()));
        dbSession.commit();
      }
    }

    profiler.stopDebug();
  }

  private PermissionTemplateDto getOrInsertDefaultTemplate(DbSession dbSession, String defaultOrganizationUuid) {
    PermissionTemplateDto permissionTemplateDto = dbClient.permissionTemplateDao().selectByUuid(dbSession, DEFAULT_TEMPLATE_UUID);
    if (permissionTemplateDto != null) {
      return permissionTemplateDto;
    }

    PermissionTemplateDto template = new PermissionTemplateDto()
      .setOrganizationUuid(defaultOrganizationUuid)
      .setName("Default template")
      .setUuid(DEFAULT_TEMPLATE_UUID)
      .setDescription("This permission template will be used as default when no other permission configuration is available")
      .setCreatedAt(new Date())
      .setUpdatedAt(new Date());

    dbClient.permissionTemplateDao().insert(dbSession, template);
    insertDefaultGroupPermissions(dbSession, template);
    dbSession.commit();
    return template;
  }

  private void insertDefaultGroupPermissions(DbSession dbSession, PermissionTemplateDto template) {
    Optional<GroupDto> admins = dbClient.groupDao().selectByName(dbSession, template.getOrganizationUuid(), DefaultGroups.ADMINISTRATORS);
    if (admins.isPresent()) {
      insertGroupPermission(dbSession, template, UserRole.ADMIN, admins.get());
      insertGroupPermission(dbSession, template, UserRole.ISSUE_ADMIN, admins.get());
    } else {
      LOG.error("Cannot setup default permission for group: " + DefaultGroups.ADMINISTRATORS);
    }
    insertGroupPermission(dbSession, template, UserRole.USER, null);
    insertGroupPermission(dbSession, template, UserRole.CODEVIEWER, null);
  }

  private void insertGroupPermission(DbSession dbSession, PermissionTemplateDto template, String permission, @Nullable GroupDto group) {
    if (group == null) {
      dbClient.permissionTemplateDao().insertGroupPermission(dbSession, template.getId(), null, permission);
    } else {
      dbClient.permissionTemplateDao().insertGroupPermission(dbSession, template.getId(), group.getId(), permission);
    }
  }

}
