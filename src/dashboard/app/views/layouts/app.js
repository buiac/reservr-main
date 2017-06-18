import React, { Component } from "react";
import { EventsList } from "../pages";
import { Modal } from "../components";
import "./app.scss";

class App extends Component {
    constructor () {
        super();
        this.state = {
            showModal: false,
            modalType: "",
            modalParams: {}
        };

        this.showModal = this.showModal.bind( this );
    }

    showModal( type, event ) {
        this.setState( {
            showModal: true,
            modalType: type,
            modalParams: {
                event
            }
        } );
    }

    render() {
        const { showModal, modalType, modalParams } = this.state;
        const modal = showModal ? <Modal type={ modalType } params={ modalParams } /> : "";
        return (
            <div>
                <h1>This is the new dashboard</h1>
                <EventsList showModal={ this.showModal } />
                { modal }
            </div>
        );
    }
}

export default App;
