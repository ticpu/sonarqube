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
  CodeSnippet,
  ListItem,
  NumberedList,
  NumberedListItem,
  UnorderedList,
} from 'design-system';
import * as React from 'react';
import { translate } from '../../../../helpers/l10n';
import { getHostUrl } from '../../../../helpers/urls';
import { CompilationInfo } from '../../components/CompilationInfo';
import GithubCFamilyExampleRepositories from '../../components/GithubCFamilyExampleRepositories';
import RenderOptions from '../../components/RenderOptions';
import SentenceWithHighlights from '../../components/SentenceWithHighlights';
import { BuildTools, OSs, TutorialModes } from '../../types';
import AlertClassicEditor from './AlertClassicEditor';
import PrepareAnalysisCommand, { PrepareType } from './PrepareAnalysisCommand';
import PublishSteps from './PublishSteps';

export interface ClangGCCProps {
  projectKey: string;
  onStepValidationChange: (isValid: boolean) => void;
}

type OsConstant = {
  [key in OSs]: {
    highlightScriptKey: string;
    script: string;
    scriptBuild: string;
  };
};

export default function ClangGCC(props: ClangGCCProps) {
  const { projectKey, onStepValidationChange } = props;
  const [os, setOs] = React.useState<OSs | undefined>(OSs.Linux);
  const host = getHostUrl();

  const codeSnippetDownload: OsConstant = {
    [OSs.Linux]: {
      script: `curl '${host}/static/cpp/build-wrapper-linux-x86.zip' --output build-wrapper.zip
unzip build-wrapper.zip`,
      highlightScriptKey:
        'onboarding.tutorial.with.azure_pipelines.BranchAnalysis.build_wrapper.ccpp.nix',
      scriptBuild:
        './build-wrapper-linux-x86/build-wrapper-linux-x86-64 --out-dir bw-output <your build command here>',
    },
    [OSs.Windows]: {
      script: `Invoke-WebRequest -Uri '${host}/static/cpp/build-wrapper-win-x86.zip' -OutFile 'build-wrapper.zip'
Expand-Archive -Path 'build-wrapper.zip' -DestinationPath '.'`,
      highlightScriptKey:
        'onboarding.tutorial.with.azure_pipelines.BranchAnalysis.build_wrapper.ccpp.win',
      scriptBuild:
        'build-wrapper-win-x86/build-wrapper-win-x86-64.exe --out-dir bw-output <your build command here>',
    },
    [OSs.MacOS]: {
      script: `curl '${host}/static/cpp/build-wrapper-macosx-x86.zip' --output build-wrapper.zip
unzip build-wrapper.zip`,
      highlightScriptKey:
        'onboarding.tutorial.with.azure_pipelines.BranchAnalysis.build_wrapper.ccpp.nix',
      scriptBuild:
        './build-wrapper-macos-x86/build-wrapper-macos-x86 --out-dir bw-output <your build command here>',
    },
  };

  React.useEffect(() => {
    if (os) {
      onStepValidationChange(true);
    } else {
      onStepValidationChange(false);
    }
  }, [os, onStepValidationChange]);

  const handlOsChange = (value: OSs) => {
    setOs(value);
  };

  return (
    <>
      <div className="sw-mt-4">{translate('onboarding.tutorial.with.azure_pipelines.os')}</div>
      <RenderOptions
        label={translate('onboarding.tutorial.with.azure_pipelines.os')}
        checked={os}
        onCheck={handlOsChange}
        optionLabelKey="onboarding.build.other.os"
        options={Object.values(OSs)}
      />

      {os && (
        <>
          <GithubCFamilyExampleRepositories
            className="sw-mt-4 sw-w-abs-600"
            os={os}
            ci={TutorialModes.AzurePipelines}
          />
          <AlertClassicEditor />
          <NumberedList className="sw-mt-4">
            <NumberedListItem>
              <SentenceWithHighlights
                translationKey="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.build_wrapper.ccpp"
                highlightPrefixKeys="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.prepare"
                highlightKeys={['pipeline']}
              />
              <UnorderedList ticks className="sw-ml-12 sw-mt-2">
                <ListItem>
                  <SentenceWithHighlights
                    translationKey="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.build_wrapper.ccpp.script"
                    highlightPrefixKeys={codeSnippetDownload[os].highlightScriptKey}
                    highlightKeys={['task', 'inline']}
                  />
                  <CodeSnippet className="sw-p-6" snippet={codeSnippetDownload[os].script} />
                </ListItem>
              </UnorderedList>
            </NumberedListItem>

            <NumberedListItem>
              <SentenceWithHighlights
                translationKey="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.prepare.ccpp"
                highlightPrefixKeys="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.prepare"
                highlightKeys={['task', 'before']}
              />
              <PrepareAnalysisCommand
                buildTool={BuildTools.CFamily}
                kind={PrepareType.StandAlone}
                projectKey={projectKey}
              />
            </NumberedListItem>

            <NumberedListItem>
              <SentenceWithHighlights
                translationKey="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.build.ccpp"
                highlightKeys={['task']}
              />
              <UnorderedList className="sw-mt-2">
                <ListItem>
                  <SentenceWithHighlights
                    translationKey="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.build_script.ccpp"
                    highlightKeys={['build_wrapper']}
                  />
                  <CodeSnippet
                    className="sw-p-6"
                    isOneLine
                    snippet={codeSnippetDownload[os].scriptBuild}
                  />
                  <CompilationInfo />
                </ListItem>
              </UnorderedList>
            </NumberedListItem>

            <NumberedListItem>
              <SentenceWithHighlights
                translationKey="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.run.ccpp"
                highlightPrefixKeys="onboarding.tutorial.with.azure_pipelines.BranchAnalysis.run"
                highlightKeys={['task', 'after']}
              />
            </NumberedListItem>

            <PublishSteps />
          </NumberedList>
        </>
      )}
    </>
  );
}
