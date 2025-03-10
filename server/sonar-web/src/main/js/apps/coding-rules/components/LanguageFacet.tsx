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
import { uniqBy } from 'lodash';
import * as React from 'react';
import withLanguagesContext from '../../../app/components/languages/withLanguagesContext';
import ListStyleFacet from '../../../components/facet/ListStyleFacet';
import { translate } from '../../../helpers/l10n';
import { highlightTerm } from '../../../helpers/search';
import { Language, Languages } from '../../../types/languages';
import { BasicProps } from './Facet';

interface Props extends BasicProps {
  disabled?: boolean;
  languages: Languages;
}

class LanguageFacet extends React.PureComponent<Props> {
  getLanguageName = (languageKey: string) => {
    const language = this.props.languages[languageKey];
    return language ? language.name : languageKey;
  };

  handleSearch = (query: string) => {
    const options = this.getAllPossibleOptions();
    const results = options.filter((language) =>
      language.name.toLowerCase().includes(query.toLowerCase())
    );
    const paging = { pageIndex: 1, pageSize: results.length, total: results.length };
    return Promise.resolve({ paging, results });
  };

  getAllPossibleOptions = () => {
    const { languages, stats = {} } = this.props;

    // add any language that presents in the facet, but might not be installed
    // for such language we don't know their display name, so let's just use their key
    // and make sure we reference each language only once
    return uniqBy<Language>(
      [...Object.values(languages), ...Object.keys(stats).map((key) => ({ key, name: key }))],
      (language: Language) => language.key
    );
  };

  renderSearchResult = ({ name }: Language, term: string) => {
    return highlightTerm(name, term);
  };

  render() {
    return (
      <ListStyleFacet<Language>
        disabled={this.props.disabled}
        disabledHelper={translate('coding_rules.filters.language.inactive')}
        facetHeader={translate('coding_rules.facet.languages')}
        showMoreAriaLabel={translate('coding_rules.facet.language.show_more')}
        showLessAriaLabel={translate('coding_rules.facet.language.show_less')}
        fetching={false}
        getFacetItemText={this.getLanguageName}
        getSearchResultKey={(language) => language.key}
        getSearchResultText={(language) => language.name}
        minSearchLength={1}
        onChange={this.props.onChange}
        onSearch={this.handleSearch}
        onToggle={this.props.onToggle}
        open={this.props.open}
        property="languages"
        renderFacetItem={this.getLanguageName}
        renderSearchResult={this.renderSearchResult}
        searchPlaceholder={translate('search.search_for_languages')}
        stats={this.props.stats}
        values={this.props.values}
      />
    );
  }
}

export default withLanguagesContext(LanguageFacet);
