/*
 * SonarQube
 * Copyright (C) 2009-2023 SonarSource SA
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
package org.sonar.server.v2.api.user.controller;

import java.util.Optional;
import javax.annotation.Nullable;
import org.sonar.api.utils.Paging;
import org.sonar.server.common.SearchResults;
import org.sonar.server.common.user.service.UserCreateRequest;
import org.sonar.server.common.user.service.UserSearchResult;
import org.sonar.server.common.user.service.UserService;
import org.sonar.server.common.user.service.UsersSearchRequest;
import org.sonar.server.exceptions.ForbiddenException;
import org.sonar.server.user.UserSession;
import org.sonar.server.v2.api.model.RestPage;
import org.sonar.server.v2.api.user.converter.UsersSearchRestResponseGenerator;
import org.sonar.server.v2.api.user.model.RestUser;
import org.sonar.server.v2.api.user.request.UserCreateRestRequest;
import org.sonar.server.v2.api.user.request.UsersSearchRestRequest;
import org.sonar.server.v2.api.user.response.UsersSearchRestResponse;

import static org.sonar.api.utils.Paging.forPageIndex;
import static org.sonar.server.exceptions.BadRequestException.checkRequest;

public class DefaultUserController implements UserController {
  private final UsersSearchRestResponseGenerator usersSearchResponseGenerator;
  private final UserService userService;
  private final UserSession userSession;

  public DefaultUserController(
    UserSession userSession,
    UserService userService,
    UsersSearchRestResponseGenerator usersSearchResponseGenerator) {
    this.userSession = userSession;
    this.usersSearchResponseGenerator = usersSearchResponseGenerator;
    this.userService = userService;
  }

  @Override
  public UsersSearchRestResponse search(UsersSearchRestRequest usersSearchRestRequest, RestPage page) {
    throwIfAdminOnlyParametersAreUsed(usersSearchRestRequest);

    SearchResults<UserSearchResult> userSearchResults = userService.findUsers(toUserSearchRequest(usersSearchRestRequest, page));
    Paging paging = forPageIndex(page.pageIndex()).withPageSize(page.pageSize()).andTotal(userSearchResults.total());

    return usersSearchResponseGenerator.toUsersForResponse(userSearchResults.searchResults(), paging);
  }

  private void throwIfAdminOnlyParametersAreUsed(UsersSearchRestRequest usersSearchRestRequest) {
    if (!userSession.isSystemAdministrator()) {
      throwIfValuePresent("sonarLintLastConnectionDateFrom", usersSearchRestRequest.sonarLintLastConnectionDateFrom());
      throwIfValuePresent("sonarLintLastConnectionDateTo", usersSearchRestRequest.sonarLintLastConnectionDateTo());
      throwIfValuePresent("sonarQubeLastConnectionDateFrom", usersSearchRestRequest.sonarQubeLastConnectionDateFrom());
      throwIfValuePresent("sonarQubeLastConnectionDateTo", usersSearchRestRequest.sonarQubeLastConnectionDateTo());
    }
  }

  private static void throwIfValuePresent(String parameter, @Nullable Object value) {
    Optional.ofNullable(value).ifPresent(v -> throwForbiddenFor(parameter));
  }

  private static void throwForbiddenFor(String parameterName) {
    throw new ForbiddenException("parameter " + parameterName + " requires Administer System permission.");
  }

  private static UsersSearchRequest toUserSearchRequest(UsersSearchRestRequest usersSearchRestRequest, RestPage page) {
    return UsersSearchRequest.builder()
      .setDeactivated(Optional.ofNullable(usersSearchRestRequest.active()).map(active -> !active).orElse(false))
      .setManaged(usersSearchRestRequest.managed())
      .setQuery(usersSearchRestRequest.q())
      .setLastConnectionDateFrom(usersSearchRestRequest.sonarQubeLastConnectionDateFrom())
      .setLastConnectionDateTo(usersSearchRestRequest.sonarQubeLastConnectionDateTo())
      .setSonarLintLastConnectionDateFrom(usersSearchRestRequest.sonarLintLastConnectionDateFrom())
      .setSonarLintLastConnectionDateTo(usersSearchRestRequest.sonarLintLastConnectionDateTo())
      .setPage(page.pageIndex())
      .setPageSize(page.pageSize())
      .build();
  }

  @Override
  public void deactivate(String login, Boolean anonymize) {
    userSession.checkLoggedIn().checkIsSystemAdministrator();
    checkRequest(!login.equals(userSession.getLogin()), "Self-deactivation is not possible");
    userService.deactivate(login, anonymize);
  }

  @Override
  public RestUser fetchUser(String login) {
    return usersSearchResponseGenerator.toRestUser(userService.fetchUser(login));
  }

  @Override
  public RestUser create(UserCreateRestRequest userCreateRestRequest) {
    userSession.checkLoggedIn().checkIsSystemAdministrator();
    UserCreateRequest userCreateRequest = toUserCreateRequest(userCreateRestRequest);
    return usersSearchResponseGenerator.toRestUser(userService.createUser(userCreateRequest));
  }

  private static UserCreateRequest toUserCreateRequest(UserCreateRestRequest userCreateRestRequest) {
    return UserCreateRequest.builder()
      .setEmail(userCreateRestRequest.email())
      .setLocal(userCreateRestRequest.local())
      .setLogin(userCreateRestRequest.login())
      .setName(userCreateRestRequest.name())
      .setPassword(userCreateRestRequest.password())
      .setScmAccounts(userCreateRestRequest.scmAccounts())
      .build();
  }

}
