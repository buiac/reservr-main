import React, { Component } from "react";
import { connect } from "react-redux";

class EventsList extends Component {
    componentDidMount() {
        this.props.fetchList()
    }

    render() {
        const { events } = this.props;
        const eventList = buildEvents( events, this );
        return (
            <div>
                <h3>events</h3>
                { eventList }
            </div>
        )
    }
};

function buildEvents( events, component ) {
    return events.map( ( event ) => (
            <button
                key={ event._id }
                onClick={ () => { component.props.showModal( "EDIT_EVENT_MODAL", event ) } }
            >
                { event.name }
            </button>
        )
    );
}

const mapStateToProps = ( state ) => ( {
    events: state.events,
} );

const mapDispatchToProps = {
    fetchList: ( ) => ( {
        type: "FETCH_EVENTS",
        meta: {
            async: true,
            blocking: true,
            path: "/events",
            method: "GET",
        },
    } )
};

export default connect( mapStateToProps, mapDispatchToProps )( EventsList );
