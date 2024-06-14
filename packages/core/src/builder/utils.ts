// Copyright (C) 2024 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { VariableConfig } from "../base/entity";
import { INIT_VERSION, VersionInfo } from "../base/version";

export function createVariable<const T extends number>(initialValue: T, forceOverwrite = false): VariableConfig<T> {
  return {
    initialValue,
    recreateBehavior: {
      type: forceOverwrite ? "overwrite" : "takeMax",
    },
  };
}

export function createVariableCanAppend(initialValue: number, appendLimit = Infinity, appendValue?: number): VariableConfig {
  appendValue ??= initialValue;
  return {
    initialValue,
    recreateBehavior: {
      type: "append",
      appendLimit,
      appendValue,
    }
  }
}

export const DEFAULT_VERSION_INFO: VersionInfo = { predicate: "since", version: INIT_VERSION };
