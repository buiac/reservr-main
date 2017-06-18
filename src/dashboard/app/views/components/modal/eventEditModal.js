import React, { Component } from "react";

class EventEditModal extends Component {
    render( ) {
        return (
            <div className="modal-content event-edit-modal">
                { this.props.params.event.name }
            </div>
        );
    }
};

export default EventEditModal;
