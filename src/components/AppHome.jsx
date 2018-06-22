import React, { Component } from 'react';
import { BrowserRouter, Route, Switch, Link, withRouter, Redirect } from 'react-router-dom';
import Feedback from './Feedback';
import io from 'socket.io-client';
import GameHome from './GameHome';
import GameRoom from './GameRoom';
import games from '../data/games';

let socket = io.connect('localhost:8080');
//let socket = io.connect(window.location.origin);

const Home = () => (
  <div className='container'>
    <div className='row'>
      <div className='col'>
        <h3>Game Select</h3>
        <hr />
      </div>
    </div>
    <div className='row'>
      <div className='col'>
        <ul className='list-group'>
          {Object.getOwnPropertyNames(games).map((game, key) => {
            return (
              <Link className='list-group-item' to={`/${game}`} key={key}>
                <strong>{games[game].name}</strong> <span className='small'>{games[game].description}</span>
              </Link>
            );
          })}
          <Link className='list-group-item' to={`/test`}>Test</Link>
        </ul>
      </div>
    </div>
  </div>
);

class AppHome extends Component {
  constructor(props) {
    super(props);
    this.state = {
      feedbackMsg: '',
      feedbackType: ''
    };
    this.clearAlert = this.clearAlert.bind(this);
    this.setAlert = this.setAlert.bind(this);
  }
  componentDidMount() {
  }
  setAlert(feedbackMsg, feedbackType, temp) {
    this.setState({feedbackMsg, feedbackType});
    if (temp) setTimeout(() => this.clearAlert(), 2000);
  }
  clearAlert() {
    this.setState({
      feedbackMsg: '',
      feedbackType: ''
    });
  }
  render() {
    const _GameHome = () => <GameHome socket={socket} setAlert={this.setAlert} clearAlert={this.clearAlert} />;
    const _GameRoom = () => <GameRoom socket={socket} setAlert={this.setAlert} clearAlert={this.clearAlert} />;
    return (
      <div>
        <BrowserRouter>
          <div className='container'>
            <Feedback feedbackMsg={this.state.feedbackMsg} feedbackType={this.state.feedbackType} clearAlert={this.clearAlert} />
            <Switch>
              <Route exact path='/' component={Home} />
              <Route path='/:game' component={_GameHome} />
              <Route path='/:game/:room' component={_GameRoom} />
            </Switch>
          </div>
        </BrowserRouter>
      </div>
    );
  }
}

export default withRouter(AppHome);