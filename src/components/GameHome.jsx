import React, { Component } from 'react';
import { Link, Redirect, withRouter } from "react-router-dom";
import games from '../data/games';

class GameHome extends Component {
  constructor(props) {
    super(props);
    this.state = {
      feedbackMsg: '',
      feedbackType: '',
      publicRooms: {},
      showCreateOptions: false,
      newURL: ''
    };
    this.toggleCreateOptions = this.toggleCreateOptions.bind(this);
    this.redirect = this.redirect.bind(this);
    this.codeInputRef = React.createRef();
  }
  componentDidMount() {
    console.log(this.props)
    var gameType = this.props.match.params.game;
    if (games[gameType]) {
      //this.props.setAlert('test', 'warning', true);
      this.props.socket.emit('gameHome', gameType);
      this.props.socket.on('publicRooms', (publicRooms) => this.setState(publicRooms));
      this.props.socket.on('joinedGame', (roomCode) => {
        //this.redirect(`${this.props.match.url}/${roomCode}`);
      });  
    }
  }

  createRoom(isPublic) {
    var gameType = this.props.match.params.game;
    this.props.clearAlert();
    this.props.socket.emit('createRoom', gameType, { isPublic });
  }

  toggleCreateOptions() {
    this.setState({
      showCreateOptions: !this.state.showCreateOptions
    });
  }

  joinRoom(roomCode) {
    var gameType = this.props.match.params.game;
    this.props.clearAlert();
    if (!roomCode) {
      this.setState({
        feedbackMsg: 'Please enter a name.',
        feedbackType: 'warning'
      });
      return;
    }
    this.props.socket.emit('joinRoom', gameType, roomCode);
  }

  redirect(url) {
    this.setState({
      newURL: url
    });
  }

  render() {
    var gameType = this.props.match.params.game;
    const gameData = games[gameType];
    if (!gameData) {
      return (
        <div className='container'>
          <div className='row'>
            <div className='col'>
              <h1>404</h1>
              <hr />
            </div>
          </div>
          <div className='row'>
            <div className='col'>
              <p>No such game found.</p>
              <Link to='/'><strong>Home</strong></Link>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className='container'>
          <div className='row mb-4'>
            <div className='col'>
              <button onClick={()=>this.redirect('/')} className='btn float-right'>Home</button>
              <button onClick={()=>this.redirect('/test')} className='btn float-right'>test</button>
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
                    <button className='btn btn-primary btn-primary btn-lg' onClick={this.toggleCreateOptions}>Start New</button>
                  </div>  
                </div>
              : 
                <ul className="nav nav-pills nav-fill">
                  <li className="nav-item">
                    <button onClick={()=> this.createRoom(true)} className="btn btn-light btn-lg btn-block">Public</button>
                  </li>
                  <li className="nav-item">
                    <button onClick={()=> this.createRoom(false)} className="btn btn-primary btn-lg btn-block">Private</button>
                  </li>
                  <li className="nav-item">
                    <button onClick={this.toggleCreateOptions} className="btn btn-link btn-lg btn-block">Cancel</button>
                  </li>
                </ul>
              }
            </div>
          </div>
          <div className='row'>
            <div className='col'>
              <h5>How to Play</h5>
              <ol>
                {gameData.instructions.map((text, key) => (
                  <li key={key}>{text}</li>
                ))}
              </ol>
            </div>
          </div>
          {Object.getOwnPropertyNames(this.state.publicRooms).length > 0 ?
            <div className='row mb-4'>
              <div className='col'>
                <h5>Public Rooms (click to join)</h5> 
                <div className='list-group'>
                  {Object.keys(this.state.publicRooms)
                    .sort((a, b) => this.state.publicRooms[a] < this.state.publicRooms[b])
                    .map((room, key) => {
                      if (key >= 20) return null;
                      return (
                        <button key={key} className='list-group-item list-group-item-light list-group-item-action' onClick={()=>this.props.joinRoom(room)}>
                          <strong>{gameData.formatRoomName ? gameData.formatRoomName(room) : room}</strong> | {this.state.publicRooms[room]} online
                        </button>
                      );
                  })}
                </div>
              </div>
            </div>
          : null}
        </div>
        {this.state.newURL ? <Redirect from={this.props.match.url} to={this.state.newURL} /> : null}
      </div>
    );
  }
}

export default withRouter(GameHome);