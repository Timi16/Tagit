import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CABR376QJFHZ5FB7TDMMGATGPLNRIEBBS3VGHBDHNBFPE5MY5Z355H46",
  }
} as const

export const Errors = {
  /**
   * Wrong length or characters.
   */
  1: {message:"InvalidTag"},
  /**
   * Duplicate registration.
   */
  2: {message:"TagTaken"},
  /**
   * Unknown tag on resolve, send, set or release.
   */
  3: {message:"NotFound"},
  /**
   * Wallet already owns a tag.
   */
  4: {message:"AlreadyHasTag"},
  /**
   * `send` found a different wallet than `expected`.
   */
  5: {message:"RecipientChanged"},
  /**
   * Asset not on the allowlist.
   */
  6: {message:"TokenNotAllowed"},
  /**
   * Zero or negative amount.
   */
  7: {message:"InvalidAmount"},
  /**
   * Sending to your own tag.
   */
  8: {message:"SelfPayment"},
  /**
   * `set_wallet` to an address that could never spend what it receives.
   */
  9: {message:"InvalidWallet"}
}






export interface TagRecord {
  created_at: u64;
  /**
 * Who can manage it.
 */
owner: string;
  tag: string;
  updated_at: u64;
  /**
 * Where payments go (defaults to owner).
 */
wallet: string;
}

export interface Client {
  /**
   * Construct and simulate a get transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Full record for profile and review screens.
   */
  get: ({tag}: {tag: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<TagRecord>>>

  /**
   * Construct and simulate a send transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pays `amount` of `token` to `tag`, only if it still resolves to `expected`.
   */
  send: ({from, tag, expected, token, amount}: {from: string, tag: string, expected: string, token: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a tag_of transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Reverse lookup: the tag owned by `owner`, if any.
   */
  tag_of: ({owner}: {owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a release transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deletes `tag` so it can be claimed again. Owner only.
   */
  release: ({tag}: {tag: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a resolve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The wallet payments to `tag` go to.
   */
  resolve: ({tag}: {tag: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a register transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claims `tag` for `owner`. One tag per wallet.
   */
  register: ({owner, tag}: {owner: string, tag: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<TagRecord>>>

  /**
   * Construct and simulate a set_wallet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Points `tag` at a different receiving wallet. Owner only.
   */
  set_wallet: ({tag, new_wallet}: {tag: string, new_wallet: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<TagRecord>>>

  /**
   * Construct and simulate a is_registered transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Availability check for the claim screen.
   */
  is_registered: ({tag}: {tag: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a is_token_allowed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_token_allowed: ({token}: {token: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a set_token_allowed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Adds or removes an asset contract from the allowlist. Admin only.
   */
  set_token_allowed: ({token, allowed}: {token: string, allowed: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, tokens}: {admin: string, tokens: Array<string>},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, tokens}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAACtGdWxsIHJlY29yZCBmb3IgcHJvZmlsZSBhbmQgcmV2aWV3IHNjcmVlbnMuAAAAAANnZXQAAAAAAQAAAAAAAAADdGFnAAAAABAAAAABAAAD6QAAB9AAAAAJVGFnUmVjb3JkAAAAAAAAAw==",
        "AAAAAAAAAEtQYXlzIGBhbW91bnRgIG9mIGB0b2tlbmAgdG8gYHRhZ2AsIG9ubHkgaWYgaXQgc3RpbGwgcmVzb2x2ZXMgdG8gYGV4cGVjdGVkYC4AAAAABHNlbmQAAAAFAAAAAAAAAARmcm9tAAAAEwAAAAAAAAADdGFnAAAAABAAAAAAAAAACGV4cGVjdGVkAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAADFSZXZlcnNlIGxvb2t1cDogdGhlIHRhZyBvd25lZCBieSBgb3duZXJgLCBpZiBhbnkuAAAAAAAABnRhZ19vZgAAAAAAAQAAAAAAAAAFb3duZXIAAAAAAAATAAAAAQAAA+gAAAAQ",
        "AAAAAAAAADVEZWxldGVzIGB0YWdgIHNvIGl0IGNhbiBiZSBjbGFpbWVkIGFnYWluLiBPd25lciBvbmx5LgAAAAAAAAdyZWxlYXNlAAAAAAEAAAAAAAAAA3RhZwAAAAAQAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAACNUaGUgd2FsbGV0IHBheW1lbnRzIHRvIGB0YWdgIGdvIHRvLgAAAAAHcmVzb2x2ZQAAAAABAAAAAAAAAAN0YWcAAAAAEAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAC1DbGFpbXMgYHRhZ2AgZm9yIGBvd25lcmAuIE9uZSB0YWcgcGVyIHdhbGxldC4AAAAAAAAIcmVnaXN0ZXIAAAACAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAA3RhZwAAAAAQAAAAAQAAA+kAAAfQAAAACVRhZ1JlY29yZAAAAAAAAAM=",
        "AAAAAAAAADlQb2ludHMgYHRhZ2AgYXQgYSBkaWZmZXJlbnQgcmVjZWl2aW5nIHdhbGxldC4gT3duZXIgb25seS4AAAAAAAAKc2V0X3dhbGxldAAAAAAAAgAAAAAAAAADdGFnAAAAABAAAAAAAAAACm5ld193YWxsZXQAAAAAABMAAAABAAAD6QAAB9AAAAAJVGFnUmVjb3JkAAAAAAAAAw==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAA=",
        "AAAAAAAAAChBdmFpbGFiaWxpdHkgY2hlY2sgZm9yIHRoZSBjbGFpbSBzY3JlZW4uAAAADWlzX3JlZ2lzdGVyZWQAAAAAAAABAAAAAAAAAAN0YWcAAAAAEAAAAAEAAAPpAAAAAQAAAAM=",
        "AAAAAAAAAAAAAAAQaXNfdG9rZW5fYWxsb3dlZAAAAAEAAAAAAAAABXRva2VuAAAAAAAAEwAAAAEAAAAB",
        "AAAAAAAAAEFBZGRzIG9yIHJlbW92ZXMgYW4gYXNzZXQgY29udHJhY3QgZnJvbSB0aGUgYWxsb3dsaXN0LiBBZG1pbiBvbmx5LgAAAAAAABFzZXRfdG9rZW5fYWxsb3dlZAAAAAAAAAIAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAHYWxsb3dlZAAAAAABAAAAAA==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACQAAABtXcm9uZyBsZW5ndGggb3IgY2hhcmFjdGVycy4AAAAACkludmFsaWRUYWcAAAAAAAEAAAAXRHVwbGljYXRlIHJlZ2lzdHJhdGlvbi4AAAAACFRhZ1Rha2VuAAAAAgAAAC1Vbmtub3duIHRhZyBvbiByZXNvbHZlLCBzZW5kLCBzZXQgb3IgcmVsZWFzZS4AAAAAAAAITm90Rm91bmQAAAADAAAAGldhbGxldCBhbHJlYWR5IG93bnMgYSB0YWcuAAAAAAANQWxyZWFkeUhhc1RhZwAAAAAAAAQAAAAwYHNlbmRgIGZvdW5kIGEgZGlmZmVyZW50IHdhbGxldCB0aGFuIGBleHBlY3RlZGAuAAAAEFJlY2lwaWVudENoYW5nZWQAAAAFAAAAG0Fzc2V0IG5vdCBvbiB0aGUgYWxsb3dsaXN0LgAAAAAPVG9rZW5Ob3RBbGxvd2VkAAAAAAYAAAAYWmVybyBvciBuZWdhdGl2ZSBhbW91bnQuAAAADUludmFsaWRBbW91bnQAAAAAAAAHAAAAGFNlbmRpbmcgdG8geW91ciBvd24gdGFnLgAAAAtTZWxmUGF5bWVudAAAAAAIAAAAQ2BzZXRfd2FsbGV0YCB0byBhbiBhZGRyZXNzIHRoYXQgY291bGQgbmV2ZXIgc3BlbmQgd2hhdCBpdCByZWNlaXZlcy4AAAAADUludmFsaWRXYWxsZXQAAAAAAAAJ",
        "AAAABQAAAHhgKCJ0YWdpdCIsICJwYWlkIiwgZnJvbSwgdG8pYCDihpIgW3RhZywgdG9rZW4sIGFtb3VudF0KCmBmcm9tYCBhbmQgYHRvYCBhcmUgdG9waWNzIHNvIGhpc3RvcnkgY2FuIGZpbHRlciBvbiBlaXRoZXIgc2lkZS4AAAAAAAAABFBhaWQAAAACAAAABXRhZ2l0AAAAAAAABHBhaWQAAAAFAAAAAAAAAARmcm9tAAAAEwAAAAEAAAAAAAAAAnRvAAAAAAATAAAAAQAAAAAAAAADdGFnAAAAABAAAAAAAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAQ==",
        "AAAABQAAADhgKCJ0YWdpdCIsICJ1cGRhdGVkIiwgdGFnKWAg4oaSIFtvbGRfd2FsbGV0LCBuZXdfd2FsbGV0XQAAAAAAAAAHVXBkYXRlZAAAAAACAAAABXRhZ2l0AAAAAAAAB3VwZGF0ZWQAAAAAAwAAAAAAAAADdGFnAAAAABAAAAABAAAAAAAAAApvbGRfd2FsbGV0AAAAAAATAAAAAAAAAAAAAAAKbmV3X3dhbGxldAAAAAAAEwAAAAAAAAAB",
        "AAAABQAAACZgKCJ0YWdpdCIsICJyZWxlYXNlZCIsIHRhZylgIOKGkiBvd25lcgAAAAAAAAAAAAhSZWxlYXNlZAAAAAIAAAAFdGFnaXQAAAAAAAAIcmVsZWFzZWQAAAACAAAAAAAAAAN0YWcAAAAAEAAAAAEAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAA",
        "AAAABQAAAChgKCJ0YWdpdCIsICJyZWdpc3RlcmVkIiwgdGFnKWAg4oaSIG93bmVyAAAAAAAAAApSZWdpc3RlcmVkAAAAAAACAAAABXRhZ2l0AAAAAAAACnJlZ2lzdGVyZWQAAAAAAAIAAAAAAAAAA3RhZwAAAAAQAAAAAQAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAA=",
        "AAAAAQAAAAAAAAAAAAAACVRhZ1JlY29yZAAAAAAAAAUAAAAAAAAACmNyZWF0ZWRfYXQAAAAAAAYAAAASV2hvIGNhbiBtYW5hZ2UgaXQuAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAN0YWcAAAAAEAAAAAAAAAAKdXBkYXRlZF9hdAAAAAAABgAAACZXaGVyZSBwYXltZW50cyBnbyAoZGVmYXVsdHMgdG8gb3duZXIpLgAAAAAABndhbGxldAAAAAAAEw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    get: this.txFromJSON<Result<TagRecord>>,
        send: this.txFromJSON<Result<void>>,
        admin: this.txFromJSON<string>,
        tag_of: this.txFromJSON<Option<string>>,
        release: this.txFromJSON<Result<void>>,
        resolve: this.txFromJSON<Result<string>>,
        register: this.txFromJSON<Result<TagRecord>>,
        set_wallet: this.txFromJSON<Result<TagRecord>>,
        is_registered: this.txFromJSON<Result<boolean>>,
        is_token_allowed: this.txFromJSON<boolean>,
        set_token_allowed: this.txFromJSON<null>
  }
}