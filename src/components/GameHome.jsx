import React, { Component } from 'react';
import { Redirect, withRouter } from "react-router-dom";
import io from 'socket.io-client';
import RoomMessages from './RoomMessages.jsx';
import Controls from './Controls.jsx';
import games from '../data/games';
import NotFound from './404';

let socket;

class GameHome extends Component {
  constructor(props) {
    super(props);
    this.state = {
      feedbackMsg: '',
      feedbackType: '',
      showCreateOptions: false,
      redirect: '',
    };
    this.redirect = this.redirect.bind(this);
    this.toggleCreateOptions = this.toggleCreateOptions.bind(this);
    this.codeInputRef = React.createRef();
  }
  componentDidMount() {
    //socket = io.connect(window.location.origin);
    socket = io.connect('localhost:8080');
    socket.on('publicRooms', (data) => this.setState(data));
    socket.on('joinedGame', (roomCode) => {
      this.redirect(`${this.props.match.url}/${roomCode}`);
    });
  }

  componentWillUnmount() {
    socket.disconnect();
  }

  createRoom(isPublic) {
    socket.emit('createRoom', this.props.gameType, { isPublic });
  }

  toggleCreateOptions() {
    this.setState({
      showCreateOptions: !this.state.showCreateOptions
    });
  }

  joinRoom(roomCode) {
    if (!roomCode) {
      this.setAlert('Please enter a name.', 'warning', true);
      return;
    }
    socket.emit('joinRoom', this.props.gameType, roomCode);
  }

  redirect(url) {
    this.setState({
      redirect: url
    });
  }
  render() {
    var gameData = games[this.props.gameType];
    return (
      <div>
        <div className='container'>
          {this.state.feedbackMsg ?
            <div className='row'>
              <div className='col'>
                <div className={'alert alert-' + this.state.feedbackType + ' alert-dismissible fade show'} role='alert'>
                  <strong>{this.state.feedbackMsg}</strong>
                  <button type='button' className='close' onClick={this.clearAlert} aria-label='Close'>
                    <span aria-hidden='true'>&times;</span>
                  </button>
                </div> 
              </div>
            </div>
          : null}
          <div className='row mb-4'>
            <div className='col'>
              <button onClick={()=>this.redirect('/')} className='btn float-right'>Home</button>
              <button onClick={()=>this.redirect(`${this.props.match.url}/test`)} className='btn float-right'>test</button>
              <h3>{gameData.name}</h3>
              <h3 className='small'>{gameData.subtitle}</h3>
              <hr />
              {!this.state.showCreateOptions ? 
                <div className='input-group'>
                  <input 
                    className='form-control form-control-lg' 
                    ref={this.codeInputRef}
                    onKeyUp={(e) => {if (e.which === 13) this.joinRoom(this.codeInputRef.current.value)}}
                    placeholder='Code' 
                    type='text' 
                  />
                  <div className='input-group-append'>
                    <button className='btn btn-light btn-lg' onClick={()=>this.joinRoom(this.codeInputRef.current.value)}>Join</button>
                    <button className='btn btn-dark btn-primary btn-lg' onClick={this.toggleCreateOptions}>Start New</button>
                  </div>  
                </div>
              : 
                <ul className="nav nav-pills nav-fill">
                  <li className="nav-item">
                    <button onClick={()=> this.createRoom(true)} className="btn btn-light btn-lg btn-block">Public</button>
                  </li>
                  <li className="nav-item">
                    <button onClick={()=> this.createRoom(false)} className="btn btn-dark btn-lg btn-block">Private</button>
                  </li>
                  <li className="nav-item">
                    <button onClick={this.toggleCreateOptions} className="btn btn-link btn-lg btn-block">Cancel</button>
                  </li>
                </ul>
              }
            </div>
          </div>
        </div>
        {this.state.redirect ? <Redirect from={this.props.match.url} to={this.state.redirect} /> : null}
      </div>
    );
  }
}

export default withRouter(GameHome);