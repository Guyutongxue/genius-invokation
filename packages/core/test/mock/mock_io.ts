import { RpcMethod, RpcRequest, RpcResponse } from "@gi-tcg/typings";
import { PlayerIO } from "../../src/io";

export class MockPlayerIO implements PlayerIO {
  readonly giveUp = false as const;

  notify() {}

  rpc<M extends RpcMethod>(method: M, data: RpcRequest[M]): Promise<RpcResponse[M]> {
    throw "unimplemented";
  }
}
