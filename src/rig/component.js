import React, { Component } from 'react';
import { RigNav } from '../rig-nav';
import { ExtensionViewContainer } from '../extension-view-container';
import { ExtensionRigConsole } from '../console';
import { ExtensionViewDialog } from '../extension-view-dialog';
import { RigConfigurationsDialog } from '../rig-configurations-dialog';
import { createExtensionObject } from '../util/extension';
import { createSignedToken } from '../util/token';
import { fetchManifest, fetchExtensionManifest } from '../util/api';
import { EXTENSION_VIEWS, BROADCASTER_CONFIG, LIVE_CONFIG, CONFIGURATIONS } from '../constants/nav-items'
import { ReverseExtensionAnchors } from '../constants/extension-types';
import { ViewerTypes } from '../constants/viewer-types';
import { OverlaySizes } from '../constants/overlay-sizes';
import { IdentityOptions } from '../constants/identity-options';
import { RIG_ROLE } from '../constants/rig';
const { ExtensionMode } = window['extension-coordinator'];

export class Rig extends Component {
  constructor(props) {
    super(props);

    this.state = {
      clientId: process.env.EXT_CLIENT_ID,
      secret: process.env.EXT_SECRET,
      version: process.env.EXT_VERSION,
      channelId: process.env.EXT_CHANNEL_ID,
      userName: process.env.EXT_USER_NAME,
      viewConfig: process.env.EXT_VIEW_CONFIG,
      mode: ExtensionMode.Viewer,
      extensionViews: {},
      manifest: {},
      showExtensionsView: false,
      showConfigurations: false,
      selectedView: EXTENSION_VIEWS,
      extension: {},
      userId: '',
      error: '',
    };
    this._boundDeleteExtensionView = this._deleteExtensionView.bind(this);
  }

  componentWillMount() {
    this._fetchInitialConfiguration();
  }

  openConfigurationsHandler = () => {
    this.setState({
      showConfigurations: true,
      selectedView: CONFIGURATIONS
    });
  }

  closeConfigurationsHandler = () => {
    this.setState({
      showConfigurations: false,
    });
  }

  viewerHandler = () => {
    this.setState({
      mode: ExtensionMode.Viewer,
      selectedView: EXTENSION_VIEWS,
      extension: {},
    });
  }

  configHandler = () => {
    this.setState({
      mode: ExtensionMode.Config,
      selectedView: BROADCASTER_CONFIG,
      extension: createExtensionObject(
        this.state.manifest,
        0,
        ViewerTypes.Broadcaster,
        '',
        this.state.userName,
        this.state.channelId,
        this.state.secret),
    });
  }

  liveConfigHandler = () => {
    this.setState({
      mode: ExtensionMode.Dashboard,
      selectedView: LIVE_CONFIG,
      extension: createExtensionObject(
        this.state.manifest,
        0,
        ViewerTypes.Broadcaster,
        '',
        this.state.userName,
        this.state.channelId,
        this.state.secret),
    });
  }

  openExtensionViewHandler = () => {
    if (this.state.error === '') {
      this.setState({
        showExtensionsView: true,
      });
    }
  }

  closeExtensionViewDialog = () => {
    this.setState({
      showExtensionsView: false
    });
  }

  refreshConfigurationsHandler = () => {
    const token = createSignedToken(RIG_ROLE, '', this.state.userId, this.state.channelId, this.state.secret);
    fetchExtensionManifest('api.twitch.tv', this.state.clientId, this.state.version, token, this._onConfigurationSuccess, this._onConfigurationError);
  }

  _onConfigurationSuccess = (data) => {
    this.setState(data);
    if (data.manifest) {
      this._initViews();
    }
  }

  _onConfigurationError = (errMsg) => {
    this.setState({
      error: errMsg,
    });
  }

  createExtensionView = () => {
    const extensionViews = this._getExtensionViews();
    const linked = this.refs.extensionViewDialog.state.identityOption === IdentityOptions.Linked;
    extensionViews.push({
      id: (extensionViews.length + 1).toString(),
      type: this.refs.extensionViewDialog.state.extensionViewType,
      extension: createExtensionObject(
        this.state.manifest,
        (extensionViews.length + 1).toString(),
        this.refs.extensionViewDialog.state.viewerType,
        linked,
        this.state.userName,
        this.state.channelId,
        this.state.secret
      ),
      linked: linked,
      role: this.refs.extensionViewDialog.state.viewerType,
      overlaySize: (this.refs.extensionViewDialog.state.overlaySize === 'Custom' ? {width: this.refs.extensionViewDialog.state.width, height: this.refs.extensionViewDialog.state.height} : OverlaySizes[this.refs.extensionViewDialog.state.overlaySize]),
    });
    this._pushExtensionViews(extensionViews);
    this.closeExtensionViewDialog();
  }

  createNewView = (extensionType, role, isLinked, viewSize) => {
    const newView = this.createView('', extensionType, role, isLinked, viewSize);
    const updatedViews = this.state.viewConfig[newView.id] = newView;
    this.setState({
      extensionViews: updatedViews,
    });
  }

  createView(id, extensionType, role, isLinked, viewSize) {
    return {
      id: id || this._getNextId(),
      type: extensionType,
      extension: createExtensionObject(
        this.state.manifest,
        role,
        isLinked,
        this.state.userName,
        this.state.channelId,
        this.state.secret
      ),
      linked: isLinked,
      role: role,
      overlaySize: (viewSize.size === 'Custom' ? {width: viewSize.width, height: viewSize.height} : OverlaySizes[viewSize.size]),
    };
  }

  createViews() {
    const views = {};
    Object.keys(this.state.viewConfig).forEach((id, index) => {
      const config = this.state.viewConfig[id];
      views[id] = this.createView(id, ReverseExtensionAnchors[config.viewType], config.role, config.isLinked, config.viewSize);
    });
    return views;
  }

  render() {
    return (
      <div>
        <RigNav
          ref="rigNav"
          selectedView={this.state.selectedView}
          viewerHandler={this.viewerHandler}
          configHandler={this.configHandler}
          liveConfigHandler={this.liveConfigHandler}
          openConfigurationsHandler={this.openConfigurationsHandler}
          error={this.state.error}/>
        <ExtensionViewContainer
          ref="extensionViewContainer"
          mode={this.state.mode}
          extensionViews={this.state.extensionViews}
          deleteExtensionViewHandler={this._boundDeleteExtensionView}
          openExtensionViewHandler={this.openExtensionViewHandler}
          extension={this.state.extension} />
        {this.state.showExtensionsView &&
          <ExtensionViewDialog
            ref="extensionViewDialog"
            extensionViews={this.state.manifest.views}
            show={this.state.showExtensionsView}
            closeHandler={this.closeExtensionViewDialog}
            saveHandler={this.createExtensionView} />}
        <RigConfigurationsDialog
          show={this.state.showConfigurations}
          config={this.state.manifest}
          closeConfigurationsHandler={this.closeConfigurationsHandler}
          refreshConfigurationsHandler={this.refreshConfigurationsHandler} />
        <ExtensionRigConsole />
      </div>
    );
  }

  _getNextId() {
    let i = 0;
    while (this.state.extensionViews[i]) {
      i += 1;
    }
    return i;
  }

  _getExtensionViews() {
    const extensionViewsValue = localStorage.getItem("extensionViews");
    return extensionViewsValue ? JSON.parse(extensionViewsValue) : extensionViewsValue;
  }

  _pushExtensionViews(newViews) {
    localStorage.setItem("extensionViews", JSON.stringify(newViews));
    this.setState({
      extensionViews: newViews,
    });
  }

  _deleteExtensionView(id) {
    delete this.state.extensionViews[id];
    this.setState({
      extensionViews: this.state.extensionViews,
    });
    //this._pushExtensionViews(this.state.extensionViews.filter(element => element.id !== id));
  }

  _fetchInitialConfiguration() {
    fetchManifest("api.twitch.tv", this.state.clientId, this.state.userName, this.state.version, this.state.channelId, this.state.secret, this._onConfigurationSuccess, this._onConfigurationError);
  }

  _initViews() {
    this.setState({
      extensionViews: this.createViews(),
    })
  }

  _initLocalStorage() {
    const extensionViewsValue = localStorage.getItem("extensionViews");
    if (!extensionViewsValue) {
      localStorage.setItem("extensionViews", JSON.stringify([]));
      return;
    }
    this.setState({
      extensionViews: JSON.parse(extensionViewsValue)
    })
  }
}
