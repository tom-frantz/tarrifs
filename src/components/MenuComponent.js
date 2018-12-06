/*
*
* Food for thought.
* State is not held from component between unmount and remount
* Props can change as if they were passed from a regular component due to rate of refreshes.
* State should be used within context for things like modals/inputs and the likes.
*
* */

import React, { Component } from 'react';
import GameComponent from "./GameComponent";

import { Card } from 'antd';


export default class MenuComponent extends GameComponent {
    constructor(reactComponent, componentType="menuComponent") {
        super(componentType, "menuComponent");
        this.menu = React.createRef();
        this.reactComponent = reactComponent;
    }

    update(gameCore, delta) {
        return true;
    }

    getReactComponent(component=false) {
        if (!component) {
            component = <this.reactComponent ref={this.menu}/>
        }

        return component;
    }
}

export class TrialReactMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
            message: "This is a default message!"
        };
    }

    render() {
        const { message } = this.state;
        return (
            <Card
                title="Default Menu"
                style={{
                    right: "-99 vw",
                    bottom: "-99 vh",
                    position: "absolute"
                }}
            >
                <p>{message}</p>
            </Card>
        )
    }
}