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
import { throwGlobalError } from '../helpers/error';
import {
  deleteJSON,
  getJSON,
  HttpStatus,
  parseJSON,
  post,
  postJSON,
  postJSONBody,
} from '../helpers/request';
import { IdentityProvider, Paging } from '../types/types';
import {
  ChangePasswordResults,
  CurrentUser,
  HomePage,
  NoticeType,
  RestUserBase,
  User,
} from '../types/users';

export function getCurrentUser(): Promise<CurrentUser> {
  return getJSON('/api/users/current', undefined, true);
}

export function dismissNotice(notice: NoticeType) {
  return post('/api/users/dismiss_notice', { notice }).catch(throwGlobalError);
}

export function changePassword(data: {
  login: string;
  password: string;
  previousPassword?: string;
}) {
  return post('/api/users/change_password', data).catch(async (response) => {
    if (response.status === HttpStatus.BadRequest) {
      const { result } = await parseJSON(response);
      return Promise.reject<ChangePasswordResults>(result);
    }

    return throwGlobalError(response);
  });
}

export interface UserGroup {
  default: boolean;
  description: string;
  id: number;
  name: string;
  selected: boolean;
}

export function getUserGroups(data: {
  login: string;
  p?: number;
  ps?: number;
  q?: string;
  selected?: string;
}): Promise<{ paging: Paging; groups: UserGroup[] }> {
  return getJSON('/api/users/groups', data);
}

export function getIdentityProviders(): Promise<{ identityProviders: IdentityProvider[] }> {
  return getJSON('/api/users/identity_providers').catch(throwGlobalError);
}

export function getUsers<T extends RestUserBase>(data: {
  q: string;
  active?: boolean;
  managed?: boolean;
  sonarQubeLastConnectionDateFrom?: string;
  sonarQubeLastConnectionDateTo?: string;
  sonarLintLastConnectionDateFrom?: string;
  sonarLintLastConnectionDateTo?: string;
  pageSize?: number;
  pageIndex?: number;
}): Promise<{ pageRestResponse: Paging; users: T[] }> {
  return getJSON('/api/v2/users', data).catch(throwGlobalError);
}

export function postUser(data: {
  email?: string;
  login: string;
  name: string;
  password?: string;
  scmAccounts: string[];
}): Promise<void | Response> {
  return postJSONBody('/api/v2/users', data);
}

export function updateUser(data: {
  email?: string;
  login: string;
  name?: string;
  scmAccount: string[];
}): Promise<{ user: User }> {
  return postJSON('/api/users/update', {
    ...data,
    scmAccount: data.scmAccount.length > 0 ? data.scmAccount : '',
  });
}

export function deleteUser({
  login,
  anonymize,
}: {
  login: string;
  anonymize?: boolean;
}): Promise<void | Response> {
  return deleteJSON(`/api/v2/users/${login}`, { anonymize }).catch(throwGlobalError);
}

export function setHomePage(homepage: HomePage): Promise<void | Response> {
  return post('/api/users/set_homepage', homepage).catch(throwGlobalError);
}
