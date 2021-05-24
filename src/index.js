import 'semantic-ui-css/semantic.min.css';
import React from 'react';
import {render} from 'react-dom';
import {App} from './app.jsx';
import { setNodeUri } from 'spycraft-tetcore'
require('./denominations')

//setNodeUri(['ws://127.0.0.1:9944/', 'wss://tetcore-rpc.parity.io/', 'wss://poc3-rpc.tetcoin.org/', 'ws://104.211.54.233:9944/'])
//setNodeUri(['ws://127.0.0.1:9944/', 'wss://poc3-rpc.tetcoin.org/'])
//setNodeUri(['ws://127.0.0.1:9944/', 'wss://tetcore-rpc.parity.io/'])
//setNodeUri(['wss://tetcore-rpc.parity.io/'])
//setNodeUri(['wss://poc3-rpc.tetcoin.org/'])
setNodeUri(['ws://127.0.0.1:9944/'])
//setNodeUri(['ws://127.0.0.1:9955/'])

render(<App/>, document.getElementById('app'));
