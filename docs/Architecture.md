TagIt — Architecture & Build Plan
21 Oct 2026 · @Timmy
Overview
TagIt lets anyone send Stellar Testnet assets to @david instead of a 56-character address. It is one Soroban contract (the tag registry, which also executes tag payments) plus one Next.js app on Vercel. There is no separate backend and no database.
Non-custodial by design. The app never holds keys or funds. Every write is signed in the user's own Stellar wallet. The contract enforces ownership with require_auth(): only the wallet that owns @david can change or release it, and only the sender can authorize a payment from their account.
The safety rule. No payment is sent to an address the user hasn't seen. The app resolves the tag, shows the full recipient address on a review screen, and passes that exact address to the contract as expected. If the tag changed hands between review and signing, the contract rejects the payment instead of paying someone new.
Scope (Testnet only):
• Register a unique @tag and link it to your wallet. Duplicates are rejected on-chain.
• Look up any tag and see the wallet it points to.
• Manage your tag: change the linked wallet or release it. Only the owner can.
• Send XLM or USDC to a tag: resolve, review, sign, send, see the hash.
• See basic payment history (sent and received).
System architecture
TagIt has three parts: the browser app with the user's wallet, Stellar's public Testnet services, and the registry contract. Tag lookups are free simulations; only claiming, managing and sending need a signature.
The app asks RPC to resolve a tag, shows the result, and the wallet signs. The registry checks ownership and the expected recipient, then moves funds through the XLM or USDC asset contract.
Where each piece of data lives
Data
Lives in
Read through
Tag → owner and wallet
Registry persistent storage
resolve, get (simulation)
Wallet → its tag
Registry persistent storage
tag_of
Payment history
Registry paid events
RPC getEvents
Balances and trustlines
User and recipient accounts
Horizon loadAccount
Private keys
User's wallet only
Never
Tag registry contract (Soroban)
One contract, tagit-registry, owns every tag and also executes tag payments. A tag maps to exactly one owner, and the owner is the only address that can change it.
Tag rules
• 3 to 20 characters, lowercase a–z, 0–9 and _ only. Stored without the @.
• The app lowercases and trims input before calling. The contract still validates every byte and rejects anything else with InvalidTag, so a raw call can't sneak in @David and @david as two tags.
• One tag per wallet in v1. That keeps "my tag" unambiguous and blocks one wallet squatting hundreds of names.
Data model
#[contracttype]
pub struct TagRecord {
    pub tag: String,
    pub owner: Address,     // who can manage it
    pub wallet: Address,    // where payments go (defaults to owner)
    pub created_at: u64,
    pub updated_at: u64,
}
Key
Storage
Holds
Tag(String)
Persistent
TagRecord
TagOf(Address)
Persistent
The owner's tag, for "my tag" and reverse lookup
AllowedToken(Address)
Instance
true for XLM SAC and Testnet USDC SAC
Admin
Instance
Can edit the token allowlist only. Cannot touch tags or funds
Every write calls extend_ttl so tags don't get archived.
Functions
Function
Signer
Effect
register(owner, tag)
owner
Validates the tag, fails with TagTaken if it exists or AlreadyHasTag if the owner has one. Links tag to owner.
set_wallet(tag, new_wallet)
owner
Points the tag at a different receiving wallet
release(tag)
owner
Deletes the tag so it can be claimed again
is_registered(tag) -> bool
anyone
Availability check for the claim screen
resolve(tag) -> Address
anyone
Returns the receiving wallet, or NotFound
get(tag) -> TagRecord
anyone
Full record for profile and review screens
tag_of(address) -> Option<String>
anyone
Reverse lookup: shows @david instead of GDQ… in history
send(from, tag, expected, token, amount)
from
Resolves the tag, checks it still equals expected, then transfers amount of token from from to that wallet. Emits a paid event.
send is the heart of the safety rule. The user approves a specific address on the review screen, and the contract refuses to pay anything else, even if the tag was re-pointed seconds earlier.
Errors
Code
Error
When
1
InvalidTag
Wrong length or characters
2
TagTaken
Duplicate registration
3
NotFound
Unknown tag on resolve, send, set or release
4
AlreadyHasTag
Wallet already owns a tag
5
RecipientChanged
send found a different wallet than expected
6
TokenNotAllowed
Asset not on the allowlist
7
InvalidAmount
Zero or negative
8
SelfPayment
Sending to your own tag
9
InvalidWallet
set_wallet to the registry's own address, which could never pay out what it received
A wrong signer never reaches these: require_auth() fails first, which is how "users cannot modify tags they do not own" is enforced.
Events
Topics
Data
Used for
("tagit", "registered", tag)
owner
Recent sign-ups, audit
("tagit", "updated", tag)
old wallet, new wallet
Security trail
("tagit", "released", tag)
owner
Audit
("tagit", "paid", from, to)
tag, token, amount
Payment history for both sides
Payment flow
A payment is five screens' worth of steps, and the money can only move after step 4. Each step either passes or stops with a plain message.
1. Enter a tag. As the user types @dav…, the app debounces 300 ms and calls resolve by simulation (free, no signature).
    ◦ Not found: "No one has claimed @davd yet." The Continue button stays disabled. This is the "invalid tag is rejected" proof.
    ◦ Found: a recipient chip appears with the tag, an avatar and the short address.
2. Pick asset and amount. XLM or USDC from the allowlist. Shows the sender's balance and blocks amounts above it.
3. Pre-flight checks (automatic, before review):
    ◦ The recipient account exists on Testnet (Horizon). If not: "@david's wallet isn't active yet."
    ◦ For USDC, the recipient has a USDC trustline. If not: "@david can't receive USDC yet. Send XLM or ask them to add USDC."
    ◦ Sender's own trustline and balance are fine.
4. Review. The full recipient address is shown in mono, alongside the tag, asset, amount and network fee. The button says exactly what happens: "Send 25 XLM to @david". This screen is mandatory; there is no shortcut past it.
5. Sign and send. The app builds send(from, tag, expected = address shown in step 4, token, amount), simulates it, opens the wallet, submits, then polls until confirmed.
    ◦ Success: the hash with a Stellar Expert link, and a receipt screen.
    ◦ RecipientChanged: "@david just changed their wallet. Review the new address before sending." The user goes back to step 4 with the new address.
    ◦ Wallet rejected: "You cancelled in your wallet. Nothing was sent."
The transfer happens inside the contract through the asset's Stellar Asset Contract. That makes it a real Testnet transaction with a real hash, signed only by the sender's wallet.
Frontend
One Next.js App Router app talks to Soroban RPC and Horizon straight from the browser. There are no API routes in v1.
Stack
Concern
Choice
Framework
Next.js (App Router) + TypeScript
Styling and motion
Tailwind CSS + Framer Motion
Wallets
@creit.tech/stellar-wallets-kit (Freighter, xBull, Lobstr, Albedo)
Chain
@stellar/stellar-sdk (rpc.Server, Horizon.Server)
Contract client
TypeScript bindings from stellar contract bindings typescript, committed under web/contract/
Data
TanStack Query (debounced tag lookups, polling after a send)
Forms
React Hook Form + Zod (tag and amount validation mirrors the contract)
Folder structure
tagit/
├─ contracts/tagit-registry/   # lib.rs, tag.rs (validation), pay.rs, errors.rs, events.rs, test.rs
├─ web/                        # Next.js app, Vercel root
│  ├─ app/  page.tsx, app/, claim/, send/, [tag]/, activity/, settings/
│  ├─ components/  tag-input, recipient-card, amount-field, tx-sheet, avatar
│  ├─ hooks/  useWallet, useMyTag, useResolveTag, useSend, useHistory, useBalances
│  ├─ lib/stellar/  config, rpc, horizon, assets, errors
│  └─ contract/   # generated bindings
├─ scripts/  deploy.sh, seed-tags.ts, e2e.ts
└─ docs/  ARCHITECTURE.md, CONTRACT.md, PROOF.md
Key hooks
• useResolveTag(tag): normalises input, debounces, simulates resolve and get, and caches for 10 s. It returns idle | checking | found | not-found | invalid.
• useSend(): runs pre-flight checks, builds send(...) with expected, signs via the wallet kit, submits, polls, and maps contract errors to plain messages.
• useHistory(address): reads paid events where the user is from or to, and turns addresses back into @tags with tag_of.
Pages
Route
What it's for
/
Landing: the pitch, a live "type a tag" demo, how it works, FAQ
/app
Home after connecting: your tag card, a Send card, recent activity
/claim
Claim your tag, with a live availability check as you type
/send
The payment flow: tag, amount, review, done
/[tag] (e.g. /david)
Public profile: tag, wallet, "Pay @david" button. Shareable link
/activity
Sent and received payments with hashes
/settings
Manage your tag: change the receiving wallet, release the tag
The search requirement is met two ways: the tag input on Send resolves as you type, and every tag has a profile page at /david.
Design direction
TagIt takes paj.cash's energy: bright sky, puffy clouds, bold all-caps headlines, playful floating shapes and a verb slogan. It is light, loud and friendly, the opposite of a dark crypto dashboard. The slogan is "Just tag it."
What we borrow from paj.cash (from its page structure and copy; we take the vibe, not its assets):
• A sky backdrop with soft clouds and curved wind lines
• Floating coloured spheres as decoration
• All-caps, punchy headlines and a verb-as-brand slogan
• The real app shown in the hero
• Sticker and stamp-style badges, plus a community and FAQ close
Tokens
Token
Value
Use
Sky
#CFEAFF → #F2F9FF
Page background gradient
Ink
#0B1B3A
Text, outlines, dark buttons
Tag blue
#2F6BFF
Primary actions, the @ mark
Sun
#FFD23F
Stickers, highlights, success confetti
Grape
#8B5CF6
Decorative spheres, secondary accents
Mint
#22C55E
Found tag, confirmed payment
Coral
#FF5A5F
Not found, errors
Type: Bricolage Grotesque ExtraBold for all-caps display, Plus Jakarta Sans for UI, JetBrains Mono for addresses and hashes.
Signature elements
• The tag pill: @david in a chunky rounded pill with a thick ink outline and a hard offset shadow (sticker style). It appears everywhere a person is shown.
• Resolve moment: typing a tag flips the pill from grey to mint with a little bounce and shows the wallet underneath.
• Send sheet: a white card with a 2px ink border and a hard shadow, like a physical receipt.
• Motion: clouds drift slowly, spheres float, buttons squash on press, and a successful payment ends in a small confetti burst.
Testing and proof
Every required proof is produced twice: once by a Rust unit test, and once on Testnet by scripts/e2e.ts, which writes the hashes into docs/PROOF.md.
Required proof
Unit test
Testnet evidence (e2e)
3+ tags registered
register alice, bob, david
3 register hashes
3+ tags resolve correctly
resolve equals each owner
resolve output vs each keypair's public key, logged side by side
5+ real payments
send moves balances
5 send hashes: XLM and USDC, at least 3 different recipients
Pay by tag, no address typed
send takes a tag, never a raw recipient
The script only passes @david plus the address it just resolved
Invalid or unknown tag rejected
InvalidTag (@A!, ab, 21 chars), NotFound
resolve("nobody_here") and send to it both fail, error code logged
Duplicate registration prevented
second register("david") gives TagTaken
Attempt from a 4th wallet fails with TagTaken
Can't modify someone else's tag
set_wallet and release by non-owner fail auth
Stranger's set_wallet("david", …) is rejected
Recipient-changed guard
set_wallet between resolve and send gives RecipientChanged
Same scenario on Testnet, rejection logged
Manual QA before recording the demo:
[ ] Connect with Freighter and one other wallet
[ ] Claim a tag, watch availability flip as you type
[ ] Send to @david and check the hash opens on Stellar Expert
[ ] Typo a tag, get the "no one has claimed" state, Continue disabled
[ ] Try to claim a taken tag, get blocked
[ ] Settings shows no controls for someone else's tag
[ ] Phone width: send flow and claim screen both work one-handed
Deployment
The contract is deployed once from the Stellar CLI. The web app ships to Vercel on every push to main. The contract id in an env var is the only link between them.
stellar keys generate deployer --network testnet --fund
stellar contract id asset --asset native --network testnet                     # XLM SAC
stellar contract id asset --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/tagit_registry.wasm \
  --source deployer --network testnet \
  -- --admin $(stellar keys address deployer) --tokens '["<XLM_SAC>","<USDC_SAC>"]'
stellar contract bindings typescript --network testnet --contract-id <TAGIT_ID> --output-dir web/contract --overwrite
Vercel: import the repo, set Root Directory to web, and add these env vars. They are all public; nothing secret lives on Vercel.
Variable
Value
NEXT_PUBLIC_NETWORK_PASSPHRASE
Test SDF Network ; September 2015
NEXT_PUBLIC_RPC_URL
https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL
https://horizon-testnet.stellar.org
NEXT_PUBLIC_TAGIT_CONTRACT_ID
From deploy.sh
NEXT_PUBLIC_XLM_SAC_ID / NEXT_PUBLIC_USDC_SAC_ID
From the two contract id asset calls
NEXT_PUBLIC_EXPLORER_URL
https://stellar.expert/explorer/testnet
Testnet resets wipe everything. Recovery: run deploy.sh, update the contract id in Vercel, run seed-tags.ts and e2e.ts, and refresh PROOF.md.
Build order and deliverables
1. Contract. Tag validation, register/set_wallet/release, resolve/get/tag_of, send with the expected guard, all unit tests green.
2. Deploy + proof. deploy.sh, seed-tags.ts (3 tags), e2e.ts (5 payments plus every rejection), giving PROOF.md.
3. App shell. Wallet connect, Testnet guard, bindings wired to env.
4. Claim flow. Live availability, register, "my tag" card.
5. Send flow. Tag input with resolve, amount, pre-flight, review, sign, receipt.
6. Profile, activity, settings.
7. Landing page in the paj-style design.
8. Ship. Vercel, manual QA, screenshots, demo video, README.
Deliverables checklist
[ ] Public GitHub repo
[ ] Contract address on Testnet, linked on Stellar Expert
[ ] Live demo URL
[ ] 5+ verifiable payment hashes (in PROOF.md)
[ ] Screenshots: landing, claim, send review, receipt, activity, settings
[ ] Demo video (3 to 4 min): claim a tag, send by tag, a typo'd tag rejected, a duplicate blocked, a stranger blocked, hashes opened
[ ] README with setup steps, plus ARCHITECTURE.md and CONTRACT.md