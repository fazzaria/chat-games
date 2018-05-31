import React, { Component } from 'react';

class PublicRoomList extends Component {
  render() {
      if (Object.getOwnPropertyNames(this.props.publicRooms).length > 0) {
        return (
          <div className='row mb-4'>
          <div className='col'>
            <h5>Public Rooms (click to join)</h5> 
            <div className='list-group'>
              {Object.keys(this.props.publicRooms)
                .sort((a, b) => this.props.publicRooms[a] < this.props.publicRooms[b])
                .map((room, key) => {
                  if (key >= 25) return null;
                  return (
                    <button key={key} className='list-group-item list-group-item-light list-group-item-action' onClick={()=>this.props.joinRoom(room)}>
                      <strong>{this.props.formatRoomName(room)}</strong> | {this.props.publicRooms[room]} online
                    </button>
                  );
              })}
            </div>
          </div>
        </div> 
      )
    } else return null;
  }
}

export default PublicRoomList;