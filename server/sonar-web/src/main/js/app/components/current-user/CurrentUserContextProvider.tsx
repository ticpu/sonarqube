/*
 * SonarQube
 * Copyright (C) 2009-2022 SonarSource SA
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
import * as React from 'react';
import { CurrentUser, HomePage } from '../../../types/users';
import { CurrentUserContext } from './CurrentUserContext';

interface Props {
  currentUser?: CurrentUser;
}

interface State {
  currentUser: CurrentUser;
}

export default class CurrentUserContextProvider extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { currentUser: props.currentUser ?? { isLoggedIn: false, dismissedNotices: {} } };
  }

  updateCurrentUserHomepage = (homepage: HomePage) => {
    this.setState(prevState => ({
      currentUser: { ...prevState.currentUser, homepage }
    }));
  };

  updateCurrentUserSonarLintAdSeen = () => {
    this.setState(prevState => ({
      currentUser: { ...prevState.currentUser, sonarLintAdSeen: true }
    }));
  };

  render() {
    return (
      <CurrentUserContext.Provider
        value={{
          currentUser: this.state.currentUser,
          updateCurrentUserHomepage: this.updateCurrentUserHomepage,
          updateCurrentUserSonarLintAdSeen: this.updateCurrentUserSonarLintAdSeen
        }}>
        {this.props.children}
      </CurrentUserContext.Provider>
    );
  }
}
