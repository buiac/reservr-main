import React, { Component } from "react";
import EventEditModal from "./eventEditModal";
import "./modal.scss";

class Modal extends Component {
    buildModalComponent( type ) {
        const { params } = this.props;

        switch ( type ) {
            case "EDIT_EVENT_MODAL":
                return EventEditModal;
            default:
                return "";
        }
    }

    render() {
        const { type, params } = this.props;
        console.log( params )

        const ModalComponent = this.buildModalComponent( type );

        console.log( ModalComponent )

        return (
            <div className="modal">
                this is a modal of type { type } with params
                <ModalComponent params={ params } />
            </div>
        )
    }
}

export default Modal;
