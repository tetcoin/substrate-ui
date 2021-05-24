const TetcoinIdenticon = require('tetcoin-identicon').default;
const jdenticon = require('jdenticon');
const {ReactiveComponent} = require('spycraft-react');
const React = require('react');
const {bytesToHex} = require('spycraft-tetcore');

const copyToClipboard = str => {
	const el = document.createElement('textarea');
	el.value = str;
	document.body.appendChild(el);
	el.select();
	document.execCommand('copy');
	document.body.removeChild(el);
};

class Jdenticon extends ReactiveComponent {
	constructor () {
		super(["account"])
    }
    readyRender () {
        return (
            <div
    			id={this.props.id}
                name={this.props.name}
                className={this.props.className}
                style={this.props.style}
                dangerouslySetInnerHTML={ {
                    __html: jdenticon.toSvg(bytesToHex(this.state.account), this.props.size || this.props.width || 32)
                } }
                width={this.props.width || this.props.size}
                height={this.props.height || this.props.size}
                onClick={() => { copyToClipboard(ss58); this.props.onCopied && this.props.onCopied(ss58); }}
            />
        );
    }
}

window.jdenticon = jdenticon;

let s_identicon = Jdenticon;

function Identicon(...args) {
    return new s_identicon(...args)
}

function setIdenticonType(type) {
    switch (type) {
        case 'tetcoin': { s_identicon = TetcoinIdenticon; break; }
        default: { s_identicon = Jdenticon; break; }
    }
}

setTimeout(() => {
	const { system } = require('spycraft-tetcore')
	system.chain.tie(name => {
		switch (name) {
			case 'Alexander': { setIdenticonType('tetcoin'); break; }
			default: { setIdenticonType('tetcore'); break; }
		}
	}),
	0
})
module.exports = { Identicon, setIdenticonType }