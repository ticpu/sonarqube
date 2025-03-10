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
import {
  ButtonPrimary,
  ButtonSecondary,
  DeferredSpinner,
  DestructiveIcon,
  FlagMessage,
  FlagSuccessIcon,
  HelperHintIcon,
  Highlight,
  InputField,
  InputSelect,
  LabelValueSelectOption,
  Link,
  Note,
  RadioButton,
  TrashIcon,
} from 'design-system';
import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { SingleValue } from 'react-select';
import { generateToken, getTokens, revokeToken } from '../../../api/user-tokens';
import { translate } from '../../../helpers/l10n';
import {
  EXPIRATION_OPTIONS,
  computeTokenExpirationDate,
  getAvailableExpirationOptions,
} from '../../../helpers/tokens';
import { TokenExpiration, TokenType, UserToken } from '../../../types/token';
import { LoggedInUser } from '../../../types/users';
import DocumentationTooltip from '../../common/DocumentationTooltip';
import ProjectTokenScopeInfo from '../components/ProjectTokenScopeInfo';
import Step from '../components/Step';
import { getUniqueTokenName } from '../utils';

interface Props {
  currentUser: Pick<LoggedInUser, 'login'>;
  projectKey: string;
  finished: boolean;
  initialTokenName?: string;
  stepNumber: number;
  open: boolean;
  onContinue: (token: string) => void;
  onOpen: VoidFunction;
}

interface State {
  existingToken: string;
  loading: boolean;
  selection: string;
  tokenName?: string;
  token?: string;
  tokens?: UserToken[];
  tokenExpiration: TokenExpiration;
  tokenExpirationOptions: { value: TokenExpiration; label: string }[];
}

const TOKEN_FORMAT_REGEX = /^[_a-z0-9]+$/;

enum TokenUse {
  GENERATE = 'generate',
  EXISTING = 'use-existing',
}

export default class TokenStep extends React.PureComponent<Props, State> {
  mounted = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      existingToken: '',
      loading: false,
      selection: TokenUse.GENERATE,
      tokenName: props.initialTokenName,
      tokenExpiration: TokenExpiration.OneMonth,
      tokenExpirationOptions: EXPIRATION_OPTIONS,
    };
  }

  async componentDidMount() {
    this.mounted = true;
    const { currentUser, initialTokenName } = this.props;
    const { tokenName } = this.state;

    const tokenExpirationOptions = await getAvailableExpirationOptions();
    if (tokenExpirationOptions && this.mounted) {
      this.setState({ tokenExpirationOptions });
    }

    const tokens = await getTokens(currentUser.login).catch(() => {
      /* noop */
    });

    if (tokens && this.mounted) {
      this.setState({ tokens });
      if (initialTokenName !== undefined && initialTokenName === tokenName) {
        this.setState({ tokenName: getUniqueTokenName(tokens, initialTokenName) });
      }
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  getToken = () =>
    this.state.selection === TokenUse.GENERATE ? this.state.token : this.state.existingToken;

  canContinue = () => {
    const { existingToken, selection, token } = this.state;
    const validExistingToken = TOKEN_FORMAT_REGEX.exec(existingToken) != null;
    return (
      (selection === TokenUse.GENERATE && token != null) ||
      (selection === TokenUse.EXISTING && existingToken && validExistingToken)
    );
  };

  handleTokenNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ tokenName: event.target.value });
  };

  handleTokenExpirationChange = (option: SingleValue<LabelValueSelectOption<TokenExpiration>>) => {
    if (option) {
      this.setState({ tokenExpiration: option.value });
    }
  };

  handleTokenGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { tokenName, tokenExpiration } = this.state;
    const { projectKey } = this.props;

    if (tokenName) {
      this.setState({ loading: true });
      try {
        const { token } = await generateToken({
          name: tokenName,
          type: TokenType.Project,
          projectKey,
          ...(tokenExpiration !== TokenExpiration.NoExpiration && {
            expirationDate: computeTokenExpirationDate(tokenExpiration),
          }),
        });
        if (this.mounted) {
          this.setState({ loading: false, token });
        }
      } catch (e) {
        this.stopLoading();
      }
    }
  };

  handleTokenRevoke = () => {
    const { tokenName } = this.state;
    if (tokenName) {
      this.setState({ loading: true });
      revokeToken({ name: tokenName }).then(() => {
        if (this.mounted) {
          this.setState({ loading: false, token: undefined, tokenName: undefined });
        }
      }, this.stopLoading);
    }
  };

  handleContinueClick = () => {
    const token = this.getToken();
    if (token) {
      this.props.onContinue(token);
    }
  };

  handleModeChange = (mode: string) => {
    this.setState({ selection: mode });
  };

  handleExisingTokenChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ existingToken: event.currentTarget.value });
  };

  stopLoading = () => {
    if (this.mounted) {
      this.setState({ loading: false });
    }
  };

  renderGenerateOption = () => {
    const { loading, selection, tokens, tokenName, tokenExpiration, tokenExpirationOptions } =
      this.state;
    return (
      <div>
        {tokens !== undefined && tokens.length > 0 ? (
          <RadioButton
            checked={selection === TokenUse.GENERATE}
            onCheck={this.handleModeChange}
            value={TokenUse.GENERATE}
          >
            {translate('onboarding.token.generate', TokenType.Project)}
          </RadioButton>
        ) : (
          translate('onboarding.token.generate', TokenType.Project)
        )}
        {selection === TokenUse.GENERATE && (
          <div className="sw-mt-4">
            <form className="sw-flex sw-items-center" onSubmit={this.handleTokenGenerate}>
              <div className="sw-flex sw-flex-col">
                <HighlightLabel className="sw-mb-2" htmlFor="generate-token-input">
                  {translate('onboarding.token.name.label')}
                  <DocumentationTooltip
                    className="sw-ml-2"
                    content={translate('onboarding.token.name.help')}
                    links={[
                      {
                        href: '/user-guide/user-account/generating-and-using-tokens/',
                        label: translate('learn_more'),
                      },
                    ]}
                  >
                    <HelperHintIcon />
                  </DocumentationTooltip>
                </HighlightLabel>
                <InputField
                  id="generate-token-input"
                  autoFocus
                  onChange={this.handleTokenNameChange}
                  required
                  size="large"
                  type="text"
                  value={tokenName ?? ''}
                />
              </div>
              <div className="sw-flex sw-flex-col sw-ml-4">
                <HighlightLabel className="sw-mb-2" htmlFor="token-select-expiration">
                  {translate('users.tokens.expires_in')}
                </HighlightLabel>
                <div className="sw-flex sw-items-center">
                  <InputSelect
                    id="token-select-expiration"
                    className="sw-w-abs-150 sw-mr-4"
                    isSearchable={false}
                    onChange={this.handleTokenExpirationChange}
                    options={tokenExpirationOptions}
                    size="full"
                    value={tokenExpirationOptions.find(
                      (option) => option.value === tokenExpiration
                    )}
                  />

                  <ButtonSecondary
                    type="submit"
                    disabled={!tokenName || loading}
                    icon={<DeferredSpinner className="sw-mr-1" loading={loading} />}
                  >
                    {translate('onboarding.token.generate')}
                  </ButtonSecondary>
                </div>
              </div>
            </form>
            <ProjectTokenScopeInfo className="width-50" />
          </div>
        )}
      </div>
    );
  };

  renderUseExistingOption = () => {
    const { existingToken } = this.state;
    const validInput = !existingToken || TOKEN_FORMAT_REGEX.exec(existingToken) != null;

    return (
      <div className="sw-mt-4">
        <RadioButton
          checked={this.state.selection === TokenUse.EXISTING}
          onCheck={this.handleModeChange}
          value={TokenUse.EXISTING}
        >
          {translate('onboarding.token.use_existing_token')}
        </RadioButton>
        {this.state.selection === TokenUse.EXISTING && (
          <div className="sw-flex sw-flex-col sw-mt-4">
            <HighlightLabel className="sw-mb-2" htmlFor="existing-token-input">
              {translate('onboarding.token.use_existing_token.label')}
              <DocumentationTooltip
                className="sw-ml-2"
                content={translate('onboarding.token.use_existing_token.help')}
                links={[
                  {
                    href: '/user-guide/user-account/generating-and-using-tokens/',
                    label: translate('learn_more'),
                  },
                ]}
              >
                <HelperHintIcon />
              </DocumentationTooltip>
            </HighlightLabel>
            <InputField
              id="existing-token-input"
              autoFocus
              onChange={this.handleExisingTokenChange}
              required
              isInvalid={!validInput}
              size="large"
              type="text"
              value={this.state.existingToken}
            />
            {!validInput && (
              <FlagMessage className="sw-mt-2 sw-w-fit" variant="error">
                {translate('onboarding.token.invalid_format')}
              </FlagMessage>
            )}
          </div>
        )}
      </div>
    );
  };

  renderForm = () => {
    const { loading, token, tokenName, tokens } = this.state;
    const canUseExisting = tokens !== undefined && tokens.length > 0;

    return (
      <div className="sw-p-4">
        {token != null ? (
          <form className="sw-flex sw-items-center" onSubmit={this.handleTokenRevoke}>
            <span>
              {tokenName}
              {': '}
              <strong className="sw-font-semibold">{token}</strong>
            </span>

            <DeferredSpinner className="sw-ml-3 sw-my-2" loading={loading}>
              <DestructiveIcon
                className="sw-ml-1"
                Icon={TrashIcon}
                aria-label={translate('onboarding.token.delete')}
                onClick={this.handleTokenRevoke}
              />
            </DeferredSpinner>
          </form>
        ) : (
          <div>
            {this.renderGenerateOption()}
            {canUseExisting && this.renderUseExistingOption()}
          </div>
        )}

        <Note as="div" className="sw-mt-6 sw-w-1/2">
          <FormattedMessage
            defaultMessage={translate('onboarding.token.text')}
            id="onboarding.token.text"
            values={{
              link: (
                <Link target="_blank" to="/account/security">
                  {translate('onboarding.token.text.user_account')}
                </Link>
              ),
            }}
          />
        </Note>

        {this.canContinue() && (
          <div className="sw-mt-4">
            <ButtonPrimary onClick={this.handleContinueClick}>
              {translate('continue')}
            </ButtonPrimary>
          </div>
        )}
      </div>
    );
  };

  renderResult = () => {
    const { selection, tokenName } = this.state;
    const token = this.getToken();

    if (!token) {
      return null;
    }

    return (
      <div className="sw-flex sw-items-center">
        <FlagSuccessIcon className="sw-mr-2" />
        <span>
          {selection === TokenUse.GENERATE && tokenName && `${tokenName}: `}
          <strong className="sw-ml-1">{token}</strong>
        </span>
      </div>
    );
  };

  render() {
    return (
      <Step
        finished={this.props.finished}
        onOpen={this.props.onOpen}
        open={this.props.open}
        renderForm={this.renderForm}
        renderResult={this.renderResult}
        stepNumber={this.props.stepNumber}
        stepTitle={translate('onboarding.token.header')}
      />
    );
  }
}

// We need to pass 'htmlFor' to the label, but
// using 'as' doesn't dynamically change the allowed props
// https://github.com/emotion-js/emotion/issues/2266
const HighlightLabel = Highlight.withComponent('label');
