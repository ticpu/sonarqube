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

import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React, { HTMLAttributeAnchorTarget } from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import tw, { theme as twTheme } from 'twin.macro';
import { themeBorder, themeColor } from '../helpers/theme';
import { TooltipWrapperInner } from './Tooltip';
import { OpenNewTabIcon } from './icons/OpenNewTabIcon';

export interface LinkProps extends RouterLinkProps {
  blurAfterClick?: boolean;
  disabled?: boolean;
  forceExternal?: boolean;
  icon?: React.ReactNode;
  isExternal?: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  preventDefault?: boolean;
  showExternalIcon?: boolean;
  stopPropagation?: boolean;
  target?: HTMLAttributeAnchorTarget;
}

function BaseLinkWithRef(props: LinkProps, ref: React.ForwardedRef<HTMLAnchorElement>) {
  const {
    children,
    blurAfterClick,
    disabled,
    icon,
    isExternal: isExternalProp = false,
    onClick,
    preventDefault,
    showExternalIcon = !icon,
    stopPropagation,
    to,
    ...rest
  } = props;

  const toAsString =
    typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}${to.hash ?? ''}`;

  const isExternal = isExternalProp || toAsString.startsWith('http');

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (blurAfterClick) {
        event.currentTarget.blur();
      }

      if (preventDefault || disabled) {
        event.preventDefault();
      }

      if (stopPropagation) {
        event.stopPropagation();
      }

      if (onClick && !disabled) {
        onClick(event);
      }
    },
    [onClick, blurAfterClick, preventDefault, stopPropagation, disabled]
  );

  if (isExternal) {
    return (
      <a
        rel="noopener noreferrer"
        target="_blank"
        {...rest}
        href={toAsString}
        onClick={handleClick}
        ref={ref}
      >
        {icon}
        {children}
        {showExternalIcon && <OpenNewTabIcon className="sw-ml-1" />}
      </a>
    );
  }

  return (
    <RouterLink ref={ref} {...rest} onClick={handleClick} to={to}>
      {icon}
      {children}
    </RouterLink>
  );
}

export const BaseLink = React.forwardRef(BaseLinkWithRef);

const StyledBaseLink = styled(BaseLink)`
  color: var(--color);
  border-bottom: ${({ children, icon, theme }) =>
    icon && !children ? themeBorder('default', 'transparent')({ theme }) : 'var(--border)'};

  &:visited {
    color: var(--color);
  }

  &:hover,
  &:focus,
  &:active {
    color: var(--active);
    border-bottom: ${({ children, icon, theme }) =>
      icon && !children ? themeBorder('default', 'transparent')({ theme }) : 'var(--borderActive)'};
  }

  & > svg {
    ${tw`sw-align-text-bottom!`}
  }

  ${({ icon }) =>
    icon &&
    css`
      margin-left: calc(${twTheme('width.icon')} + ${twTheme('spacing.1')});

      & > svg,
      & > img {
        ${tw`sw-mr-1`}

        margin-left: calc(-1 * (${twTheme('width.icon')} + ${twTheme('spacing.1')}));
      }
    `};
`;

export const DrilldownLink = styled(StyledBaseLink)`
  ${tw`sw-heading-lg`}
  ${tw`sw-tracking-tight`}
  ${tw`sw-whitespace-nowrap`}

  ${({ disabled, theme }) =>
    disabled
      ? tw`sw-cursor-default`
      : `--active: ${themeColor('linkActive')({ theme })};
         --border: ${themeBorder('default', 'drilldownBorder')({ theme })};
         --borderActive: ${themeBorder('default', 'linkActive')({ theme })};`};

  --color: ${themeColor('drilldown')};
`;

DrilldownLink.displayName = 'DrilldownLink';

export const HoverLink = styled(StyledBaseLink)`
  text-decoration: none;

  --color: ${themeColor('linkDiscreet')};
  --active: ${themeColor('linkActive')};
  --border: ${themeBorder('default', 'transparent')};
  --borderActive: ${themeBorder('default', 'linkActive')};

  ${TooltipWrapperInner} & {
    --active: ${themeColor('linkTooltipActive')};
    --borderActive: ${themeBorder('default', 'linkTooltipActive')};
  }
`;
HoverLink.displayName = 'HoverLink';

export const LinkBox = styled(StyledBaseLink)`
  text-decoration: none;

  &:hover,
  &:focus,
  &:active {
    background-color: ${themeColor('dropdownMenuHover')};
    display: block;
  }
`;
LinkBox.displayName = 'LinkBox';

export const DiscreetLinkBox = styled(StyledBaseLink)`
  text-decoration: none;

  &:hover,
  &:focus,
  &:active {
    background-color: none;
    display: block;
  }
`;
LinkBox.displayName = 'DiscreetLinkBox';

export const DiscreetLink = styled(HoverLink)`
  --border: ${themeBorder('default', 'linkDiscreet')};
`;
DiscreetLink.displayName = 'DiscreetLink';

export const StandoutLink = styled(StyledBaseLink)`
  ${tw`sw-font-semibold`}
  ${tw`sw-no-underline`}

  --color: ${themeColor('linkDefault')};
  --active: ${themeColor('linkActive')};
  --border: ${themeBorder('default', 'linkDefault')};
  --borderActive: ${themeBorder('default', 'linkDefault')};

  ${TooltipWrapperInner} & {
    --color: ${themeColor('linkTooltipDefault')};
    --active: ${themeColor('linkTooltipActive')};
    --border: ${themeBorder('default', 'linkTooltipDefault')};
    --borderActive: ${themeBorder('default', 'linkTooltipActive')};
  }
`;
StandoutLink.displayName = 'StandoutLink';

export const IssueIndicatorLink = styled(BaseLink)`
  color: ${themeColor('codeLineMeta')};
  text-decoration: none;

  ${tw`sw-whitespace-nowrap`}
`;
