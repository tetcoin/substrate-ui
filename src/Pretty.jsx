import React from 'react';
import { ReactiveComponent } from 'spycraft-react';
import { pretty } from 'spycraft-tetcore';

export class Pretty extends ReactiveComponent {
	constructor () {
		super(["value", "default", "className"])
	}
	render () {
		if (this.ready() || this.props.default == null) {
			return (<span className={this.state.className} name={this.props.name}>
				{(this.props.prefix || '') + pretty(this.state.value) + (this.props.suffix || '')}
			</span>)
		} else {
			return <span>{this.props.default}</span>
		}
	}
}
