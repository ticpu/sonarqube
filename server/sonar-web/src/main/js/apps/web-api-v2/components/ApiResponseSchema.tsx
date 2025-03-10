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

import { CodeSnippet, TextMuted } from 'design-system';
import { OpenAPIV3 } from 'openapi-types';
import React, { HtmlHTMLAttributes } from 'react';
import { translate } from '../../../helpers/l10n';
import { ExcludeReferences } from '../types';
import { mapOpenAPISchema } from '../utils';

interface Props extends HtmlHTMLAttributes<HTMLDivElement> {
  content?: Exclude<ExcludeReferences<OpenAPIV3.ResponseObject>['content'], undefined>;
}

export default function ApiResponseSchema(props: Props) {
  const { content, ...other } = props;
  if (!content || !content['application/json']?.schema) {
    return <TextMuted text={translate('no_data')} />;
  }

  return (
    <CodeSnippet
      language="json"
      className="sw-p-6"
      snippet={JSON.stringify(mapOpenAPISchema(content['application/json'].schema), null, 2)}
      wrap
      {...other}
    />
  );
}
