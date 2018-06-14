import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, withRouter } from 'react-router-dom';
import games from '../data/games';
import GameHome from './GameHome';
import NotFound from './404';

const Game = ({match}) => (games[match.params.game] ? <GameHome gameType={`${match.params.game}`} /> : <NotFound />);
const GameRoom = () => (<NotFound />);

const Home = () => (
  <div className='container'>
    <div className='row'>
      <div className='col-lg-12'>
        <h1>Game Select</h1>
        <hr />
      </div>
    </div>
    <div className='row'>
      <div className='col-lg-12'>
        <ul className='list-group'>
          {Object.keys(games).map((game, key) => {
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
  render() {
    return (
      <Router>
        <Switch>
          <Route exact path='/' component={Home} />
          <Route path='/:game' component={Game} />
          <Route path='/:game/:room' component={GameRoom} />
        </Switch>
      </Router>
    );
  }
}

export default withRouter(AppHome);