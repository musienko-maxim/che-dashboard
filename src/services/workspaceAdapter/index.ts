/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  devfileToDevWorkspace,
  devWorkspaceToDevfile,
  IDevfile,
} from '@eclipse-che/devworkspace-client';
import { attributesToType, typeToAttributes } from '../storageTypes';
import { DevWorkspaceStatus, WorkspaceStatus } from '../helpers/types';
import { DEVWORKSPACE_NEXT_START_ANNOTATION } from '../workspace-client/devWorkspaceClient';
import { V1alpha2DevWorkspace } from '@devfile/api';

const ROUTING_CLASS = 'che';

export interface Workspace {
  readonly ref: che.Workspace | V1alpha2DevWorkspace;

  readonly id: string;
  name: string;
  readonly namespace: string;
  readonly infrastructureNamespace: string;
  readonly created: number;
  readonly updated: number;
  status: WorkspaceStatus | DevWorkspaceStatus;
  readonly ideUrl?: string;
  devfile: che.WorkspaceDevfile | IDevfile;
  storageType: che.WorkspaceStorageType;
  readonly projects: string[];
  readonly isStarting: boolean;
  readonly isStopped: boolean;
  readonly isStopping: boolean;
  readonly isRunning: boolean;
  readonly hasError: boolean;
}

export class WorkspaceAdapter<T extends che.Workspace | V1alpha2DevWorkspace> implements Workspace {
  private readonly workspace: T;

  constructor(workspace: T) {
    if (isWorkspaceV1(workspace) || isWorkspaceV2(workspace)) {
      this.workspace = workspace;
    } else {
      console.error('Unexpected workspace object shape:', workspace);
      throw new Error('Unexpected workspace object shape.');
    }
  }

  get ref(): T {
    return this.workspace;
  }

  get id(): string {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.id;
    } else {
      return (this.workspace as V1alpha2DevWorkspace).status?.devworkspaceId || '';
    }
  }

  get name(): string {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.devfile.metadata.name || '';
    } else {
      return ((this.workspace as V1alpha2DevWorkspace).metadata as any)?.name || '';
    }
  }

  set name(name: string) {
    if (isWorkspaceV1(this.workspace)) {
      this.workspace.devfile.metadata.name = name;
    } else {
      console.error('Not implemented: set name of the devworkspace.');
    }
  }

  get namespace(): string {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.namespace || '';
    } else {
      return ((this.workspace as V1alpha2DevWorkspace).metadata as any)?.namespace || '';
    }
  }

  get infrastructureNamespace(): string {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.attributes?.infrastructureNamespace || '';
    } else {
      return ((this.workspace as V1alpha2DevWorkspace).metadata as any)?.namespace;
    }
  }

  get created(): number {
    if (isWorkspaceV1(this.workspace)) {
      return parseInt(this.workspace.attributes?.created || '', 10) || 0;
    } else {
      const reference = this.workspace as V1alpha2DevWorkspace;
      const timestamp = parseInt(reference.metadata.creationTimestamp || '0', 10);
      if (!timestamp) {
        return 0;
      }
      return new Date(timestamp).valueOf();
    }
  }

  get updated(): number {
    if (isWorkspaceV1(this.workspace)) {
      return parseInt(this.workspace.attributes?.updated || '', 10) || 0;
    } else {
      return this.created;
    }
  }

  get status(): WorkspaceStatus | DevWorkspaceStatus {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.status as WorkspaceStatus;
    } else {
      return (this.workspace as V1alpha2DevWorkspace).status?.phase as DevWorkspaceStatus;
    }
  }

  get isStarting(): boolean {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.STARTING;
    } else {
      return (this.workspace as V1alpha2DevWorkspace).status?.phase as DevWorkspaceStatus === DevWorkspaceStatus.STARTING;
    }
  }

  get isStopped(): boolean {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.STOPPED;
    } else {
      return (this.workspace as V1alpha2DevWorkspace).status?.phase as DevWorkspaceStatus === DevWorkspaceStatus.STOPPED;
    }
  }

  get isStopping(): boolean {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.STOPPING;
    } else {
      return (this.workspace as V1alpha2DevWorkspace).status?.phase as DevWorkspaceStatus === DevWorkspaceStatus.STOPPING;
    }
  }

  get isRunning(): boolean {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.RUNNING;
    } else {
      return (this.workspace as V1alpha2DevWorkspace).status?.phase as DevWorkspaceStatus === DevWorkspaceStatus.RUNNING;
    }
  }

  get hasError(): boolean {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.status as WorkspaceStatus === WorkspaceStatus.ERROR;
    } else {
      return (this.workspace as V1alpha2DevWorkspace).status?.phase as DevWorkspaceStatus === DevWorkspaceStatus.FAILED;
    }
  }

  get ideUrl(): string | undefined {
    if (isWorkspaceV1(this.workspace)) {
      const runtime = this.workspace.runtime;
      if (!runtime || !runtime.machines) {
        return;
      }
      for (const machineName of Object.keys(runtime.machines)) {
        const servers = runtime.machines[machineName].servers || {};
        for (const serverId of Object.keys(servers)) {
          const attributes = (servers[serverId] as any).attributes;
          if (attributes && attributes['type'] === 'ide') {
            return servers[serverId].url;
          }
        }
      }
    } else {
      return (this.workspace as V1alpha2DevWorkspace)?.status?.mainUrl;
    }
  }

  get storageType(): che.WorkspaceStorageType {
    if (isWorkspaceV1(this.workspace)) {
      return attributesToType(this.workspace.devfile.attributes);
    } else {
      console.error('Not implemented: get storage type of the devworkspace.');
      return attributesToType(undefined);
    }
  }

  set storageType(type: che.WorkspaceStorageType) {
    if (isWorkspaceV1(this.workspace)) {
      const attributes = typeToAttributes(type);
      Object.assign(this.workspace.devfile.attributes, attributes);
    } else {
      console.error('Not implemented: set storage type of the devworkspace.');
    }
  }

  get devfile(): che.WorkspaceDevfile | IDevfile {
    if (isWorkspaceV1(this.workspace)) {
      return this.workspace.devfile as T extends che.Workspace ? che.WorkspaceDevfile : V1alpha2DevWorkspace;
    } else {
      const currentWorkspace = this.workspace as V1alpha2DevWorkspace;
      if (currentWorkspace.metadata.annotations && currentWorkspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]) {
        return devWorkspaceToDevfile(JSON.parse(currentWorkspace.metadata.annotations[DEVWORKSPACE_NEXT_START_ANNOTATION]));
      } else {
        return devWorkspaceToDevfile(currentWorkspace) as T extends che.Workspace ? che.WorkspaceDevfile : IDevWorkspaceDevfile;
      }
    }
  }

  set devfile(devfile: che.WorkspaceDevfile | V1alpha2DevWorkspace) {
    if (isWorkspaceV1(this.workspace)) {
      this.workspace.devfile = devfile as che.WorkspaceDevfile;
    } else {
      (this.workspace as V1alpha2DevWorkspace) = devfileToDevWorkspace(
        devfile as IDevfile,
        ROUTING_CLASS,
        this.status === DevWorkspaceStatus.RUNNING
      );
    }
  }

  get projects(): string[] {
    if (isWorkspaceV1(this.workspace)) {
      return (this.workspace.devfile.projects || [])
        .map(project => project.name);
    } else {
      const devfile = devWorkspaceToDevfile(this.workspace as V1alpha2DevWorkspace);
      return (devfile.projects || [])
        .map(project => project.name);
    }
  }

}

export function convertWorkspace<T extends che.Workspace | V1alpha2DevWorkspace>(workspace: T): Workspace {
  return new WorkspaceAdapter(workspace);
}

export function isWorkspaceV1(workspace: che.Workspace | V1alpha2DevWorkspace): workspace is che.Workspace {
  return (workspace as che.Workspace).id !== undefined
    && (workspace as che.Workspace).devfile !== undefined
    && (workspace as che.Workspace).status !== undefined;
}

export function isWorkspaceV2(workspace: che.Workspace | V1alpha2DevWorkspace): workspace is V1alpha2DevWorkspace {
  return (workspace as V1alpha2DevWorkspace).kind === 'DevWorkspace';
}

export function isDevfileV1(devfile: che.WorkspaceDevfile | IDevfile): devfile is che.WorkspaceDevfile {
  return !isDevfileV2(devfile);
}

export function isDevfileV2(devfile: che.WorkspaceDevfile | IDevfile): devfile is IDevfile {
  return (devfile as IDevfile).schemaVersion !== undefined;
}
