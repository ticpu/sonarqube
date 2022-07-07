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
import { RuleDescriptionSection } from '../../apps/coding-rules/rule';
import { translate } from '../../helpers/l10n';
import { scrollToElement } from '../../helpers/scrolling';
import { Dict } from '../../types/types';
import { ButtonLink } from '../controls/buttons';
import { Alert } from '../ui/Alert';
import DefenseInDepth from './educationPrinciples/DefenseInDepth';
import LeastTrustPrinciple from './educationPrinciples/LeastTrustPrinciple';
import RuleDescription from './RuleDescription';
import './style.css';

interface Props {
  sections?: RuleDescriptionSection[];
  educationPrinciples?: string[];
  showNotification?: boolean;
  educationPrinciplesRef?: React.RefObject<HTMLDivElement>;
}

const EDUCATION_PRINCIPLES_MAP: Dict<React.ComponentType> = {
  defense_in_depth: DefenseInDepth,
  least_trust_principle: LeastTrustPrinciple
};
export default class MoreInfoRuleDescription extends React.PureComponent<Props, {}> {
  handleNotificationScroll = () => {
    const element = this.props.educationPrinciplesRef?.current;
    if (element) {
      scrollToElement(element, { topOffset: 20, bottomOffset: 250 });
    }
  };

  render() {
    const { showNotification, sections = [], educationPrinciples = [] } = this.props;
    return (
      <>
        {showNotification && (
          <div className="big-padded-top big-padded-left big-padded-right rule-desc info-message">
            <Alert variant="info">
              <p className="little-spacer-bottom little-spacer-top">
                {translate('coding_rules.more_info.notification_message')}
              </p>
              <ButtonLink
                onClick={() => {
                  this.handleNotificationScroll();
                }}>
                {translate('coding_rules.more_info.scroll_message')}
              </ButtonLink>
            </Alert>
          </div>
        )}
        {sections.length > 0 && (
          <>
            <div className="big-padded-left big-padded-right big-padded-top rule-desc">
              <h2 className="null-spacer-bottom">
                {translate('coding_rules.more_info.resources.title')}
              </h2>
            </div>
            <RuleDescription key="more-info" sections={sections} />
          </>
        )}

        {educationPrinciples.length > 0 && (
          <>
            <div className="big-padded-left big-padded-right rule-desc">
              <h2 ref={this.props.educationPrinciplesRef} className="null-spacer-top">
                {translate('coding_rules.more_info.education_principles.title')}
              </h2>
            </div>
            {educationPrinciples.map(key => {
              const Concept = EDUCATION_PRINCIPLES_MAP[key];
              if (Concept === undefined) {
                return null;
              }
              return (
                <div key={key} className="education-principles rule-desc">
                  <Concept />
                </div>
              );
            })}
          </>
        )}
      </>
    );
  }
}
