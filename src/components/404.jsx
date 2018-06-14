import React, { Component } from 'react';
import { Redirect, withRouter } from "react-router-dom";

class NotFound extends Component {
  constructor(props) {
    super(props);
    this.state = {
      redirect: ''
    };
    this.redirect = this.redirect.bind(this);
  }
  redirect(url) {
    this.setState({
      redirect: url
    });
  }
  render() {
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
            <p>No page found with that name.</p>
            <button className='btn' onClick={()=>this.redirect('/')}>Go Back</button>
          </div>
        </div>
        {this.state.redirect ? <Redirect from={this.props.match.url} to={this.state.redirect} /> : null}
      </div>
    );
  }
}

export default withRouter(NotFound);