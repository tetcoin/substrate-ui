const jdenticon = require('jdenticon');
import React from 'react';
require('semantic-ui-css/semantic.min.css');
import {Icon, Accordion, List, Checkbox, Label, Header, Segment, Divider, Button} from 'semantic-ui-react';
import {Spook, TransformSpook} from 'spycraft';
import {ReactiveComponent, If, Rspan} from 'spycraft-react';
import {calls, runtime, chain, system, runtimeUp, ss58Decode, ss58Encode, pretty,
	addressBook, secretStore, metadata, nodeService, bytesToHex, hexToBytes, AccountId} from 'spycraft-tetcore';
import {Identicon} from './Identicon';
import {AccountIdSpook, SignerSpook} from './AccountIdSpook.jsx';
import {BalanceSpook} from './BalanceSpook.jsx';
import {InputSpook} from './InputSpook.jsx';
import {TransactButton} from './TransactButton.jsx';
import {FileUploadSpook} from './FileUploadSpook.jsx';
import {StakingStatusLabel} from './StakingStatusLabel';
import {WalletList, SecretItem} from './WalletList';
import {AddressBookList} from './AddressBookList';
import {TransformSpookButton} from './TransformSpookButton';
import {Pretty} from './Pretty';

export class App extends ReactiveComponent {
	constructor () {
		super([], { ensureRuntime: runtimeUp })

		// For debug only.
		window.runtime = runtime;
		window.secretStore = secretStore;
		window.addressBook = addressBook;
		window.chain = chain;
		window.calls = calls;
		window.system = system;
		window.that = this;
		window.metadata = metadata;
	}

	readyRender() {
		return (<div>
			<Heading />
			<WalletSegment />
			<Divider hidden />
			<AddressBookSegment />
			<Divider hidden />
			<FundingSegment />
			{runtime.staking != null &&
			<div>
			 <Divider hidden />
			 <StakingSegment />
			</div>
			}
			<Divider hidden />
			<UpgradeSegment />
			<Divider hidden />
			<PokeSegment />
			<Divider hidden />
			<ParachainSegment />
			{runtime.staking != null &&
			<div>
			 <Divider hidden />
			 <ValidationSegment />
			</div>
			}
			<Divider hidden />
			<TransactionsSegment />
		</div>);
	}
}

class AccountIdsSpook extends ReactiveComponent {
	constructor () {
		super(['accounts'])
	}
	readyRender () {
		return <AccountIdsSpookInner accounts={this.state.accounts} spook={this.props.spook}/>
	}
}

class AccountIdsSpookInner extends React.Component {
	constructor () {
		super()
		this.state = {selected: {}}
	}
	componentDidMount () {
		if (this.props.spook) {
			this.tieKey = this.props.spook.tie(v => {
				let selected = {}
				v.forEach(k => selected[bytesToHex(k)] = true)
				this.handleEdit(selected, false)
			})
		}
	}
	componentWillUnmount () {
		if (this.props.spook && this.tieKey) {
			this.props.spook.untie(this.tieKey);
		}
	}
	handleEdit (selected, trigger = true) {
		this.setState({selected})
		if (trigger) {
			this.props.spook.trigger(Object.keys(selected).map(hex => new AccountId(hexToBytes(hex))))
		}
	}
	toggle (hexkey) {
		let selected = Object.assign({}, this.state.selected)
		if (selected[hexkey]) {
			delete selected[hexkey]
		} else {
			selected[hexkey] = true
		}
		this.handleEdit(selected)
	}
	
	render () {
		let nice = key => {
			let known = addressBook().find(key)
			if (known) {
				return <span>{known.name}</span>
			}
			known = secretStore().find(key)
			if (known) {
				return <span>{known.name}</span>
			}
			return <Pretty value={runtime.indices.ss58Encode(key)}/>
		}
		return <List divided verticalAlign='bottom' style={{padding: '0 0 4px 4px', overflow: 'auto', maxHeight: '20em'}}>{
			this.props.accounts.map(key => {
				let hexkey = bytesToHex(key)
				return <List.Item key={hexkey} onClick={() => this.toggle(hexkey)}>
					<List.Content floated='right'>
						<Checkbox toggle checked={!!this.state.selected[hexkey]}/>
					</List.Content>
					<span className='ui avatar image' style={{minWidth: '36px'}}>
						<Identicon account={key} />
					</span>
					<List.Content>
						<List.Header>{nice(key)}<StakingStatusLabel id={key}/></List.Header>
						<List.Description>{ss58Encode(key)}</List.Description>
					</List.Content>
				</List.Item>
			})
		}</List>
	}
}

class StakingTable extends ReactiveComponent {
	constructor () {
		super([], { exposure: runtime.staking.exposure })
	}

	readyRender () {
		let exposure = Object.values(this.state.exposure)
		exposure.sort((a, b) => b.total.sub(a.total))
		return <table><tbody>{exposure.map(i => <tr key={bytesToHex(i.validator)}>
			<td><Identicon account={i.validator} className={i.invulnerable ? 'invulnerable' : ''} size={24}/></td>
			<td>{ss58Encode(i.validator)}</td>
			<td><Pretty value={i.total}/></td>
			<td>= <Pretty value={i.own}/></td>
			<td> + { i.others.length } nominators</td>
		</tr>)}</tbody></table>
	}
}

class TransactionsSegment extends React.Component {
	constructor () {
		super()

		this.txhex = new Spook
	}

	render () {
		return <Segment style={{margin: '1em'}} padded>
			<Header as='h2'>
				<Icon name='certificate' />
				<Header.Content>
					Transactions
					<Header.Subheader>Send custom transactions</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{paddingBottom: '1em'}}>
				<div style={{paddingBottom: '1em'}}>
					<div style={{fontSize: 'small'}}>Custom Transaction Data</div>
					<InputSpook spook={this.txhex}/>
				</div>
				<TransactButton tx={this.txhex.map(hexToBytes)} content="Publish" icon="sign in" />
			</div>
		</Segment>
	}
}

class StakingSegment extends React.Component {
	constructor () {
		super()
		this.state = {activeIndex: 0}
		this.amount = new Spook
		this.lockAmount = new Spook
		this.staking = new Spook
		this.stash = new Spook
		this.controller = new Spook
		this.nominations = new Spook
		this.sessionKey = new Spook

		window.stakingSegment = this
	}

	render () {
		if (!this.spooking) {
			this.spooking = runtime.staking.spooking(this.staking)
		}
		let activeIndex = this.state.activeIndex || 0
		return <Segment style={{margin: '1em'}} padded>
			<Header as='h2'>
				<Icon name='certificate' />
				<Header.Content>
					Staking
					<Header.Subheader>Lock and unlock your funds, register to validate or nominate others</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{paddingBottom: '1em'}}>
				<StakingTable />
			</div>
			<div style={{paddingBottom: '1em'}}>
				<Accordion styled>
					<Accordion.Title active={activeIndex == 0} onClick={()=>this.setState({activeIndex: 0})}>
						<Icon name='dropdown' />
						Lock
					</Accordion.Title>
					<Accordion.Content active={activeIndex == 0}>
						{runtime.balances != null &&
						<div style={{paddingBottom: '1em'}}>
							<div style={{fontSize: 'small'}}>stash (<b>lockup</b>) account</div>
							<SignerSpook spook={this.stash}/>
							<If condition={this.stash.ready()} then={<span>
								<Label>Balance available
									<Label.Detail>
										<Pretty value={runtime.balances.balance(this.stash)}/>
									</Label.Detail>
								</Label>
								<StakingStatusLabel id={this.stash}/>
							</span>}/>
						</div>
						}
						<div style={{paddingBottom: '1em'}}>
							<div style={{fontSize: 'small'}}>controller account</div>
							<SignerSpook spook={this.controller}/>
							<If condition={this.controller.ready()} then={<span>
								<StakingStatusLabel id={this.controller}/>
							</span>}/>
						</div>
						<div style={{paddingBottom: '1em'}}>
							<div style={{paddingBottom: '1em'}}>
								<div style={{fontSize: 'small'}}>lock amount</div>
								<BalanceSpook spook={this.lockAmount}/>
							</div>
						</div>
						{runtime.indices != null &&
						<div style={{paddingBottom: '1em'}}>
							<TransactButton
								content={this.lockAmount.map(a => `LOCK ${pretty(a)}`)}
								icon="sign in"
								tx={{
									sender: runtime.indices.tryIndex(this.stash),
									call: calls.staking.spook(runtime.indices.tryIndex(this.controller), this.lockAmount, "Staked"),
								}}
								negative
							/>
						</div>
						}
					</Accordion.Content>

					<Accordion.Title active={activeIndex === 1} onClick={()=>this.setState({activeIndex: 1})}>
						<Icon name='dropdown' />
						Deposit/Withdraw
					</Accordion.Title>
					<Accordion.Content active={activeIndex === 1}>
						{runtime.balances != null &&
						<div style={{paddingBottom: '1em'}}>
							<div style={{fontSize: 'small'}}>account</div>
							<SignerSpook spook={this.staking}/>
							<If condition={this.spooking.ledger.stash.ready()} then={<span>
								<Label>Total balance
									<Label.Detail>
										<Pretty value={runtime.balances.balance(this.spooking.ledger.stash)}/>
									</Label.Detail>
								</Label>
								<StakingStatusLabel id={this.spooking.ledger.stash}/>
							</span>}/>
						</div>
						}
						<div style={{paddingBottom: '1em'}}>
							<div style={{paddingBottom: '1em'}}>
								<div style={{fontSize: 'small'}}>amount</div>
								<BalanceSpook spook={this.amount}/>
							</div>
						</div>
						{runtime.indices != null &&
						<div style={{paddingBottom: '1em'}}>
							<TransactButton
								content="Deposit"
								icon="sign in"
								tx={{
									sender: runtime.indices.tryIndex(this.spooking.ledger.stash),
									call: calls.staking.spookExtra(this.amount),
								}}
							/>
							<TransactButton
								content="Withdraw"
								icon="sign in"
								tx={{
									sender: runtime.indices.tryIndex(this.spooking.ledger.stash),
									call: calls.staking.unspook(this.amount),
								}}
							/>
							<TransactButton
								content="Finalise"
								icon="sign in"
								tx={{
									sender: runtime.indices.tryIndex(this.spooking.ledger.stash),
									call: calls.staking.withdrawUnspooked(),
								}}
							/>
						</div>
						}
					</Accordion.Content>

					<Accordion.Title active={activeIndex === 2} onClick={()=>this.setState({activeIndex: 2})}>
						<Icon name='dropdown' />
						Validating
					</Accordion.Title>
					<Accordion.Content active={activeIndex === 2}>
					<div style={{paddingBottom: '1em'}}>
						<div style={{fontSize: 'small'}}>account</div>
							<SignerSpook spook={this.staking}/>
							<If condition={this.spooking.ledger.stash.ready()} then={<span>
								<StakingStatusLabel id={this.spooking.ledger.stash}/>
							</span>}/>
						</div>
						<div style={{paddingBottom: '1em'}}>
							<TransactButton
								content="Validate"
								icon="sign out"
								tx={{
									sender: runtime.indices.tryIndex(this.spooking.controller),
									call: calls.staking.validate({ unstakeThreshold: 4, validatorPayment: 0 })
								}}
							/>
							<TransactButton
								content="Stop"
								icon="stop"
								tx={{
									sender: runtime.indices.tryIndex(this.spooking.controller),
									call: calls.staking.chill()
								}}
								negative
							/>
						</div>
					</Accordion.Content>

					<Accordion.Title active={activeIndex === 3} onClick={()=>this.setState({activeIndex: 3})}>
						<Icon name='dropdown' />
						Nominating
					</Accordion.Title>
					<Accordion.Content active={activeIndex === 3}>
						<div style={{paddingBottom: '1em'}}>
							<div style={{fontSize: 'small'}}>account</div>
							<SignerSpook spook={this.staking}/>
							<If condition={this.spooking.ledger.stash.ready()} then={<span>
								<StakingStatusLabel id={this.spooking.ledger.stash}/>
							</span>}/>
						</div>
						<div style={{paddingBottom: '1em'}}>
							<div style={{fontSize: 'small'}}>potential validators</div>
							<AccountIdsSpook accounts={runtime.staking.validators.all.mapEach(x => x.key)} spook={this.nominations}/>
						</div>
						{runtime.indices != null &&
						<div style={{paddingBottom: '1em'}}>
							<TransactButton
								content="Nominate"
								icon="hand point right"
								tx={{
									sender: runtime.indices.tryIndex(this.spooking.controller),
									call: calls.staking.nominate(this.nominations.mapEach(x => runtime.indices.tryIndex(x)))
								}}
							/>
							<TransactButton
								content="Stop"
								icon="stop"
								tx={{
									sender: runtime.indices.tryIndex(this.spooking.controller),
									call: calls.staking.chill()
								}}
								negative
							/>
						</div>
						}
					</Accordion.Content>

					<Accordion.Title active={activeIndex == 4} onClick={()=>this.setState({activeIndex: 4})}>
						<Icon name='dropdown' />
						Sessions
					</Accordion.Title>
					<Accordion.Content active={activeIndex == 4}>
						<div style={{paddingBottom: '1em'}}>
							<div style={{fontSize: 'small'}}>account</div>
							<SignerSpook spook={this.staking}/>
							<If condition={this.spooking.ledger.stash.ready()} then={<span>
								<StakingStatusLabel id={this.spooking.ledger.stash}/>
							</span>}/>
						</div>
						<div style={{paddingBottom: '1em'}}>
							<div style={{fontSize: 'small'}}>session key</div>
							<SignerSpook spook={this.sessionKey}/>
						</div>
						{runtime.indices != null &&
						<div style={{paddingBottom: '1em'}}>
							<TransactButton
								content="Set Key"
								icon="sign in"
								tx={{
									sender: runtime.indices.tryIndex(this.spooking.controller),
									call: calls.session.setKey(this.sessionKey),
								}}
								negative
							/>
						</div>
						}
					</Accordion.Content>
				</Accordion>
			</div>
		</Segment>			
	}
}

class UpgradeSegment extends React.Component {
	constructor () {
		super()
		this.conditionSpook = runtime.metadata.map(m =>
			m.modules && m.modules.some(o => o.name === 'sudo')
			|| m.modules.some(o => o.name === 'upgrade_key')
		)
		this.runtime = new Spook
	}
	render() {
		return <If condition={this.conditionSpook} then={
			<Segment style={{margin: '1em'}} padded>
				<Header as='h2'>
					<Icon name='search' />
					<Header.Content>
						Runtime Upgrade
						<Header.Subheader>Upgrade the runtime using the UpgradeKey module</Header.Subheader>
					</Header.Content>
				</Header>
				<div style={{paddingBottom: '1em'}}></div>
				<FileUploadSpook spook={this.runtime} content='Select Runtime' />
				<TransactButton
					content="Upgrade"
					icon='warning'
					tx={{
						sender: runtime.sudo
							? runtime.sudo.key
							: runtime.upgrade_key.key,
						call: calls.sudo
							? calls.sudo.sudo(calls.consensus.setCode(this.runtime))
							: calls.upgrade_key.upgrade(this.runtime)
					}}
				/>
			</Segment>
		}/>
	}
}

class Heading extends React.Component {
	render () {
		return <div>
			<If
				condition={nodeService().status.map(x => !!x.connected)}
				then={<Label>Connected <Label.Detail>
					<Pretty className="value" value={nodeService().status.sub('connected')}/>
				</Label.Detail></Label>}
				else={<Label>Not connected</Label>}
			/>
			<Label>Name <Label.Detail>
				<Pretty className="value" value={system.name}/> v<Pretty className="value" value={system.version}/>
			</Label.Detail></Label>
			<Label>Chain <Label.Detail>
				<Pretty className="value" value={system.chain}/>
			</Label.Detail></Label>
			<Label>Runtime <Label.Detail>
				<Pretty className="value" value={runtime.version.specName}/> v<Pretty className="value" value={runtime.version.specVersion}/> (
					<Pretty className="value" value={runtime.version.implName}/> v<Pretty className="value" value={runtime.version.implVersion}/>
				)
			</Label.Detail></Label>
			<Label>Height <Label.Detail>
				<Pretty className="value" value={chain.height}/> (with <Pretty className="value" value={chain.lag}/> lag)
			</Label.Detail></Label>
			<Label>Authorities <Label.Detail>
				<Rspan className="value">{
					runtime.core.authorities.mapEach((a, i) => <Identicon key={bytesToHex(a) + i} account={a} size={16}/>)
				}</Rspan>
			</Label.Detail></Label>
			{runtime.staking != null &&
			<Label>Validators <Label.Detail>
				<Rspan className="value">{
					runtime.staking.exposure.map(slots => Object.keys(slots).map((k, i) => <Identicon key={bytesToHex(slots[k].validator) + i} account={slots[k].validator} className={slots[k].invulnerable ? 'invulnerable' : ''} size={16}/>))
				}</Rspan>
			</Label.Detail></Label>
			}
			{runtime.balances != null &&
			<Label>Total issuance <Label.Detail>
				<Pretty className="value" value={runtime.balances.totalIssuance}/>
			</Label.Detail></Label>
			}
		</div>
	}
}

class ParachainSegment extends React.Component {
	constructor () {
		super()
		this.parachainBinary = new Spook;
		this.parachainId = new Spook;
		this.parachainHead = new Spook;
	}
	render () {
		return <If condition={runtime.metadata.map(m => m.modules && m.modules.some(o => o.name === 'sudo') && m.modules.some(o => o.name === 'parachains'))} then={
			<Segment style={{margin: '1em'}} padded>
				<Header as='h2'>
					<Icon name='chain' />
					<Header.Content>
						Parachain Registration
						<Header.Subheader>Add a new Parachain</Header.Subheader>
					</Header.Content>
				</Header>
				<div style={{paddingBottom: '1em'}}></div>
				<InputSpook spook={this.parachainId} placeholder='Enter a Parachain ID'/>
				<InputSpook spook={this.parachainHead} placeholder='Initial head data for the Parachain'/>
				<FileUploadSpook spook={this.parachainBinary} content='Select Parachain Binary' />
				<TransactButton
					content="Register"
					icon='warning'
					tx={{
						sender: runtime.sudo ? runtime.sudo.key : null,
						call: calls.sudo && calls.parachains ? calls.sudo.sudo(calls.parachains.registerParachain(this.parachainId, this.parachainBinary, this.parachainHead.map(hexToBytes))) : null
					}}
				/>
			</Segment>
		}/>
	}
}

class PokeSegment extends React.Component {
	constructor () {
		super()
		this.storageKey = new Spook;
		this.storageValue = new Spook;
	}
	render () {
		return <If condition={runtime.metadata.map(m => m.modules && m.modules.some(o => o.name === 'sudo'))} then={
			<Segment style={{margin: '1em'}} padded>
				<Header as='h2'>
					<Icon name='search' />
					<Header.Content>
						Poke
						<Header.Subheader>Set a particular key of storage to a particular value</Header.Subheader>
					</Header.Content>
				</Header>
				<div style={{paddingBottom: '1em'}}></div>
				<InputSpook spook={this.storageKey} placeholder='Storage key e.g. 0xf00baa' />
				<InputSpook spook={this.storageValue} placeholder='Storage value e.g. 0xf00baa' />
				<TransactButton
					content="Poke"
					icon='warning'
					tx={{
						sender: runtime.sudo ? runtime.sudo.key : null,
						call: calls.sudo ? calls.sudo.sudo(calls.consensus.setStorage([[this.storageKey.map(hexToBytes), this.storageValue.map(hexToBytes)]])) : null
					}}
				/>
			</Segment>
		}/>		
	}
}

class FundingSegment extends React.Component {
	constructor () {
		super()

		this.source = new Spook;
		this.amount = new Spook;
		this.destination = new Spook;
	}
	render () {
		return <Segment style={{margin: '1em'}} padded>
			<Header as='h2'>
				<Icon name='send' />
				<Header.Content>
					Send Funds
					<Header.Subheader>Send funds from your account to another</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{paddingBottom: '1em'}}>
				<div style={{fontSize: 'small'}}>from</div>
				<SignerSpook spook={this.source}/>
				<If condition={this.source.ready()} then={<span>
					{runtime.balances != null &&
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.source)}/>
						</Label.Detail>
					</Label>
					}
					<Label>Nonce
						<Label.Detail>
							<Pretty value={runtime.system.accountNonce(this.source)}/>
						</Label.Detail>
					</Label>
				</span>}/>
			</div>
			{runtime.balances != null &&
			<div style={{paddingBottom: '1em'}}>
				<div style={{fontSize: 'small'}}>to</div>
				<AccountIdSpook spook={this.destination}/>
				<If condition={this.destination.ready()} then={
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.destination)}/>
						</Label.Detail>
					</Label>
				}/>
			</div>
			}
			<div style={{paddingBottom: '1em'}}>
				<div style={{fontSize: 'small'}}>amount</div>
				<BalanceSpook spook={this.amount}/>
			</div>
			{(runtime.balances != null || runtime.indices != null) &&
			<TransactButton
				content="Send"
				icon='send'
				tx={{
					sender: runtime.indices.tryIndex(this.source),
					call: calls.balances.transfer(runtime.indices.tryIndex(this.destination), this.amount),
					compact: false,
					longevity: true
				}}
			/>
			}
		</Segment>
	}
}

class AddressBookSegment extends React.Component {
	constructor () {
		super()
		this.nick = new Spook
		this.lookup = new Spook
	}
	render () {
		return <Segment style={{margin: '1em'}} padded>
			<Header as='h2'>
				<Icon name='search' />
				<Header.Content>
					Address Book
					<Header.Subheader>Inspect the status of any account and name it for later use</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{paddingBottom: '1em'}}>
				<div style={{fontSize: 'small'}}>lookup account</div>
				<AccountIdSpook spook={this.lookup}/>
				<If condition={this.lookup.ready()} then={<div>
					{runtime.balances != null &&
					<Label>Balance
						<Label.Detail>
							<Pretty value={runtime.balances.balance(this.lookup)}/>
						</Label.Detail>
					</Label>
					}
					<Label>Nonce
						<Label.Detail>
							<Pretty value={runtime.system.accountNonce(this.lookup)}/>
						</Label.Detail>
					</Label>
					<StakingStatusLabel id={this.lookup}/>
					{runtime.indices != null &&
					<If condition={runtime.indices.tryIndex(this.lookup, null).map(x => x !== null)} then={
						<Label>Short-form
							<Label.Detail>
								<Rspan>{runtime.indices.tryIndex(this.lookup).map(i => ss58Encode(i) + ` (index ${i})`)}</Rspan>
							</Label.Detail>
						</Label>
					}/>
				    }
					<Label>Address
						<Label.Detail>
							<Pretty value={this.lookup}/>
						</Label.Detail>
					</Label>
				</div>}/>
			</div>
			<div style={{paddingBottom: '1em'}}>
				<div style={{fontSize: 'small'}}>name</div>
				<InputSpook
					spook={this.nick}
					placeholder='A name for this address'
					validator={n => n ? addressBook().map(ss => ss.byName[n] ? null : n) : null}
					action={<TransformSpookButton
						content='Add'
						transform={(name, account) => { addressBook().submit(account, name); return true }}
						args={[this.nick, this.lookup]}
						immediate
					/>}
				/>
			</div>
			<div style={{paddingBottom: '1em'}}>
				<AddressBookList/>
			</div>
		</Segment>
	}
}

class WalletSegment extends React.Component {
	constructor () {
		super()
		this.seed = new Spook;
		this.seedAccount = this.seed.map(s => s ? secretStore().accountFromPhrase(s) : undefined)
		this.seedAccount.use()
		this.name = new Spook;
	}
	render () {
		return <Segment style={{margin: '1em'}}>
			<Header as='h2'>
				<Icon name='key' />
				<Header.Content>
					Wallet
					<Header.Subheader>Manage your secret keys</Header.Subheader>
				</Header.Content>
			</Header>
			<div style={{paddingBottom: '1em'}}>
				<div style={{fontSize: 'small'}}>seed</div>
				<InputSpook
					spook={this.seed}
					reversible
					placeholder='Some seed for this key'
					validator={n => n || null}
					action={<Button content="Another" onClick={() => this.seed.trigger(secretStore().generateMnemonic())} />}
					iconPosition='left'
					icon={<i style={{opacity: 1}} className='icon'><Identicon account={this.seedAccount} size={28} style={{marginTop: '5px'}}/></i>}
				/>
			</div>
			<div style={{paddingBottom: '1em'}}>
				<div style={{fontSize: 'small'}}>name</div>
				<InputSpook
					spook={this.name}
					placeholder='A name for this key'
					validator={n => n ? secretStore().map(ss => ss.byName[n] ? null : n) : null}
					action={<TransformSpookButton
						content='Create'
						transform={(name, seed) => secretStore().submit(seed, name)}
						args={[this.name, this.seed]}
						immediate
					/>}
				/>
			</div>
			<div style={{paddingBottom: '1em'}}>
				<WalletList/>
			</div>
		</Segment>
	}
}

class ValidationSegment extends React.Component {
	constructor () {
		super()
		this.validatorCount = new Spook
		this.condition = runtime.metadata.map(m => m.modules && m.modules.some(o => o.name === 'sudo'))
	}
	render () {
		return <If condition={this.condition} then={
			<Segment style={{margin: '1em'}} padded>
				<Header as='h2'>
					<Icon name='chain' />
					<Header.Content>
						Validator Group
						<Header.Subheader>Manipulate the validator group</Header.Subheader>
					</Header.Content>
				</Header>
				<div style={{paddingBottom: '1em'}}></div>
				<InputSpook spook={this.validatorCount} placeholder='Enter a new number of validators'/>
				<TransactButton
					content="Set"
					icon='warning'
					tx={{
						sender: runtime.sudo ? runtime.sudo.key : null,
						call: calls.sudo ? calls.sudo.sudo(calls.staking.setValidatorCount(this.validatorCount)) : null
					}}
				/>
				<div style={{paddingBottom: '1em'}}></div>
				<TransactButton
					content="Force New Era"
					icon='warning'
					tx={{
						sender: runtime.sudo ? runtime.sudo.key : null,
						call: calls.sudo ? calls.sudo.sudo(calls.staking.forceNewEra(true)) : null
					}}
				/>
			</Segment>
		}/>
	}
}
