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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce, flatten } from 'lodash';
import * as React from 'react';
import { useCallback, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  deleteBranch,
  deletePullRequest,
  excludeBranchFromPurge,
  getBranches,
  getPullRequests,
  renameBranch,
  setMainBranch,
} from '../api/branches';
import { dismissAnalysisWarning, getAnalysisStatus } from '../api/ce';
import { getQualityGateProjectStatus } from '../api/quality-gates';
import { AvailableFeaturesContext } from '../app/components/available-features/AvailableFeaturesContext';
import { useLocation } from '../components/hoc/withRouter';
import { isBranch, isPullRequest } from '../helpers/branch-like';
import { extractStatusConditionsFromProjectStatus } from '../helpers/qualityGates';
import { searchParamsToQuery } from '../helpers/urls';
import { BranchLike } from '../types/branch-like';
import { isApplication, isPortfolioLike, isProject } from '../types/component';
import { Feature } from '../types/features';
import { Component } from '../types/types';

// This will prevent refresh when navigating from page to page.
const BRANCHES_STALE_TIME = 30_000;

enum InnerState {
  Details = 'details',
  Warning = 'warning',
  Status = 'status',
}

function useBranchesQueryKey(innerState: InnerState) {
  // Currently, we do not have the component in a react-state ready
  // Once we refactor we will be able to fetch it from query state.
  // We will be able to make sure that the component is not a portfolio.
  // Mixing query param and react-state is dangerous.
  // It should be avoided as much as possible.
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);

  if (searchParams.has('pullRequest') && searchParams.has('id')) {
    return [
      'branches',
      searchParams.get('id') as string,
      'pull-request',
      searchParams.get('pullRequest') as string,
      innerState,
    ] as const;
  } else if (searchParams.has('branch') && searchParams.has('id')) {
    return [
      'branches',
      searchParams.get('id') as string,
      'branch',
      searchParams.get('branch') as string,
      innerState,
    ] as const;
  } else if (searchParams.has('id')) {
    return ['branches', searchParams.get('id') as string, innerState] as const;
  }
  return ['branches'];
}

function useMutateBranchQueryKey() {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);

  if (searchParams.has('id')) {
    return ['branches', searchParams.get('id') as string] as const;
  }
  return ['branches'];
}

function getContext(key: ReturnType<typeof useBranchesQueryKey>) {
  const [_b, componentKey, prOrBranch, branchKey] = key;
  if (prOrBranch === 'pull-request') {
    return { componentKey, query: { pullRequest: branchKey } };
  }
  if (prOrBranch === 'branch') {
    return { componentKey, query: { branch: branchKey } };
  }
  return { componentKey, query: {} };
}

export function useBranchesQuery(component?: Component) {
  const features = useContext(AvailableFeaturesContext);
  const key = useBranchesQueryKey(InnerState.Details);
  return useQuery({
    queryKey: key,
    queryFn: async ({ queryKey: [_, key, prOrBranch, name] }) => {
      if (component === undefined || key === undefined) {
        return { branchLikes: [] };
      }
      if (isPortfolioLike(component.qualifier)) {
        return { branchLikes: [] };
      }

      const branchLikesPromise =
        isProject(component.qualifier) && features.includes(Feature.BranchSupport)
          ? [getBranches(key), getPullRequests(key)]
          : [getBranches(key)];
      const branchLikes = await Promise.all(branchLikesPromise).then(flatten<BranchLike>);
      const branchLike =
        prOrBranch === 'pull-request'
          ? branchLikes.find((b) => isPullRequest(b) && b.key === name)
          : branchLikes.find(
              (b) => isBranch(b) && (prOrBranch === 'branch' ? b.name === name : b.isMain)
            );
      return { branchLikes, branchLike };
    },
    // The check of the key must desapear once component state is in react-query
    enabled: !!component && component.key === key[1],
    staleTime: BRANCHES_STALE_TIME,
  });
}

export function useBranchStatusQuery(component: Component) {
  const key = useBranchesQueryKey(InnerState.Status);
  return useQuery({
    queryKey: key,
    queryFn: async ({ queryKey }) => {
      const { query } = getContext(queryKey);
      if (!isProject(component.qualifier)) {
        return {};
      }
      const projectStatus = await getQualityGateProjectStatus({
        projectKey: component.key,
        ...query,
      }).catch(() => undefined);
      if (projectStatus === undefined) {
        return {};
      }

      const { ignoredConditions, status } = projectStatus;
      const conditions = extractStatusConditionsFromProjectStatus(projectStatus);
      return {
        conditions,
        ignoredConditions,
        status,
      };
    },
    enabled: isProject(component.qualifier) || isApplication(component.qualifier),
    staleTime: BRANCHES_STALE_TIME,
  });
}

export function useBranchWarrningQuery(component: Component) {
  const branchQuery = useBranchesQuery(component);
  const branchLike = branchQuery.data?.branchLike;
  return useQuery({
    queryKey: useBranchesQueryKey(InnerState.Warning),
    queryFn: async ({ queryKey }) => {
      const { query, componentKey } = getContext(queryKey);
      const { component: branchStatus } = await getAnalysisStatus({
        component: componentKey,
        ...query,
      });
      return branchStatus.warnings;
    },
    enabled: !!branchLike && isProject(component.qualifier),
    staleTime: BRANCHES_STALE_TIME,
  });
}

export function useDismissBranchWarningMutation() {
  type DismissArg = { component: Component; key: string };
  const queryClient = useQueryClient();
  const invalidateKey = useBranchesQueryKey(InnerState.Warning);

  return useMutation({
    mutationFn: async ({ component, key }: DismissArg) => {
      await dismissAnalysisWarning(component.key, key);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    },
  });
}

export function useExcludeFromPurgeMutation() {
  const queryClient = useQueryClient();
  const invalidateKey = useMutateBranchQueryKey();

  type ExcludeFromPurgeArg = { component: Component; key: string; exclude: boolean };

  return useMutation({
    mutationFn: async ({ component, key, exclude }: ExcludeFromPurgeArg) => {
      await excludeBranchFromPurge(component.key, key, exclude);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    },
  });
}

export function useDeletBranchMutation() {
  type DeleteArg = { branchLike: BranchLike; component: Component };
  const queryClient = useQueryClient();
  const [params, setSearhParam] = useSearchParams();
  const invalidateKey = useMutateBranchQueryKey();

  return useMutation({
    mutationFn: async ({ branchLike, component }: DeleteArg) => {
      await (isPullRequest(branchLike)
        ? deletePullRequest({
            project: component.key,
            pullRequest: branchLike.key,
          })
        : deleteBranch({
            branch: branchLike.name,
            project: component.key,
          }));

      if (
        isBranch(branchLike) &&
        params.has('branch') &&
        params.get('branch') === branchLike.name
      ) {
        setSearhParam(searchParamsToQuery(params, ['branch']));
        return { navigate: true };
      }

      if (
        isPullRequest(branchLike) &&
        params.has('pullRequest') &&
        params.get('pullRequest') === branchLike.key
      ) {
        setSearhParam(searchParamsToQuery(params, ['pullRequest']));
        return { navigate: true };
      }
      return { navigate: false };
    },
    onSuccess({ navigate }) {
      if (!navigate) {
        queryClient.invalidateQueries({ queryKey: invalidateKey });
      }
    },
  });
}

export function useRenameMainBranchMutation() {
  type RenameMainBranchArg = { name: string; component: Component };
  const queryClient = useQueryClient();
  const invalidateKey = useMutateBranchQueryKey();

  return useMutation({
    mutationFn: async ({ component, name }: RenameMainBranchArg) => {
      await renameBranch(component.key, name);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    },
  });
}

export function useSetMainBranchMutation() {
  type SetAsMainBranchArg = { branchName: string; component: Component };
  const queryClient = useQueryClient();
  const invalidateKey = useMutateBranchQueryKey();

  return useMutation({
    mutationFn: async ({ component, branchName }: SetAsMainBranchArg) => {
      await setMainBranch(component.key, branchName);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    },
  });
}

/**
 * Helper functions that sould be avoid. Instead convert the component into functional
 * and/or use proper react-query
 */
const DELAY_REFRECH = 1_000;

export function useRefreshBranchStatus(): () => void {
  const queryClient = useQueryClient();
  const invalidateStatusKey = useBranchesQueryKey(InnerState.Status);
  const invalidateDetailsKey = useBranchesQueryKey(InnerState.Details);

  return useCallback(
    debounce(() => {
      queryClient.invalidateQueries({
        queryKey: invalidateStatusKey,
      });
      queryClient.invalidateQueries({
        queryKey: invalidateDetailsKey,
      });
    }, DELAY_REFRECH),
    [invalidateDetailsKey, invalidateStatusKey]
  );
}

export function useRefreshBranches() {
  const queryClient = useQueryClient();
  const invalidateKey = useMutateBranchQueryKey();

  return () => {
    queryClient.invalidateQueries({ queryKey: invalidateKey });
  };
}

export function withBranchLikes<P extends { component?: Component }>(
  WrappedComponent: React.ComponentType<
    P & { branchLikes?: BranchLike[]; branchLike?: BranchLike; isFetchingBranch?: boolean }
  >
): React.ComponentType<Omit<P, 'branchLike' | 'branchLikes'>> {
  return function WithBranchLike(p: P) {
    const { data, isFetching } = useBranchesQuery(p.component);
    return (
      <WrappedComponent
        branchLikes={data?.branchLikes ?? []}
        branchLike={data?.branchLike}
        isFetchingBranch={isFetching}
        {...p}
      />
    );
  };
}

export function withBranchStatusRefresh<
  P extends { refreshBranchStatus: ReturnType<typeof useRefreshBranchStatus> }
>(WrappedComponent: React.ComponentType<P>): React.ComponentType<Omit<P, 'refreshBranchStatus'>> {
  return function WithBranchStatusRefresh(props: P) {
    const refresh = useRefreshBranchStatus();

    return <WrappedComponent {...props} refreshBranchStatus={refresh} />;
  };
}
