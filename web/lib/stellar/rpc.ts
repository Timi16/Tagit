import { rpc } from "@stellar/stellar-sdk";

import { config } from "./config";

export const rpcServer = new rpc.Server(config.rpcUrl);
