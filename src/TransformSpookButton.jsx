import React from 'react';
import {Button} from 'semantic-ui-react';
import {Spook} from 'spycraft';
import {ReactiveComponent} from 'spycraft-react';

export class TransformSpookButton extends ReactiveComponent {
	constructor () {
		super (['content', 'disabled', 'icon'])

		this.state = { spook: null, result: undefined }
	}

	clicked () {
		if (this.state.result) {
			this.setState({ result: undefined })
			return
		}

		let spook = this.props.spook
			? this.props.spook()
			: this.props.transform
			? this.argsSpook.latched().map(args => this.props.transform(...args))
			: undefined
		if (spook) {
			this.setState({ spook })
			let that = this
			spook.map(result => that.setState({ result }))
			spook.then(result => that.setState({ spook: null, result: that.props.immediate ? undefined : result }))
		}
	}

	render () {
		this.argsSpook = Spook.all(this.props.args);
		return <TransformSpookButtonAux
			content={this.state.content}
			onClick={() => this.clicked()}
			disabled={this.state.disabled || !!this.state.spook}
			forceEnabled={this.state.result && !this.state.spook}
			icon={this.state.result ? this.state.result.icon ? this.state.result.icon : 'tick' : this.state.icon }
			label={this.state.result ? this.state.result.label ? this.state.result.label : 'Done' : this.state.label }
			ready={this.argsSpook.ready()}
		/>
	}
}

class TransformSpookButtonAux extends ReactiveComponent {
	constructor () {
		super(['ready'])
	}
	render () {
		return <Button
			content={this.props.content}
			onClick={this.props.onClick}
			disabled={(this.props.disabled || !this.state.ready) && !this.props.forceEnabled}
			icon={this.props.icon}
			label={this.props.label}
		/>
	}
}