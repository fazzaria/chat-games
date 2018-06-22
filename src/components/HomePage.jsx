import React, { Component } from 'react';
import InstructionsText from './InstructionsText.jsx';
import PublicRoomsList from './PublicRoomsList.jsx';

class HomePage extends Component {
  render() {
    return (
      <div>
        <div className='row mb-4'>
          <div className='col'>
            <h3>Séance with Friends</h3>
            <h3 className='small'>the addicting game of online necromancy</h3>
            <hr />
            {this.props.showIsPublic === false ? 
              <div className='input-group'>
                <input 
                  className='form-control form-control-lg' 
                  ref={this.props.codeInputRef}
                  onKeyUp={(e) => {if (e.which === 13) this.props.joinRoom(this.props.codeInputRef.current.value)}}
                  placeholder='Code' 
                  type='text' 
                />
                <div className='input-group-append'>
                  <button className='btn btn-light btn-lg' onClick={()=>this.props.joinRoom(this.props.codeInputRef.current.value)}>Join</button>
                  <button className='btn btn-dark btn-primary btn-lg' onClick={this.props.createRoom}>Start New</button>
                </div>  
              </div>
            : 
              <ul className="nav nav-pills nav-fill">
                <li className="nav-item">
                  <button onClick={()=> this.props.createRoom(true)} className="btn btn-light btn-lg btn-block">Public</button>
                </li>
                <li className="nav-item">
                  <button onClick={()=> this.props.createRoom(false)} className="btn btn-dark btn-lg btn-block">Private</button>
                </li>
                <li className="nav-item">
                  <button onClick={this.props.cancelCreateRoom} className="btn btn-link btn-lg btn-block">Cancel</button>
                </li>
              </ul>
            }
          </div>
        </div>
        <PublicRoomsList 
          publicRooms={this.props.publicRooms}
          joinRoom={this.props.joinRoom}
          formatRoomName={this.props.formatRoomName}
        />
        <div className='row'>
          <div className='col'>
            <InstructionsText />
          </div>
        </div>
      </div>
    );
  }
}

export default HomePage;