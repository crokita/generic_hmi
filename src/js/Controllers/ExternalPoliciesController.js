import sdlController from './SDLController';
import bcController from './BCController';

class ExternalPoliciesController {
    constructor() {
        this.packClient = null
        this.unpackClient = null
        this.packUrl = null
        this.unpackUrl = null
        this.sysReqParams = {}
        this.policyUpdateRetryTimer = null
        this.retryCount = 0;
        this.retryTimeout = 0;
    }
    connectPolicyManager(packUrl, unpackUrl) {
        if(packUrl) {
            this.packUrl = packUrl
        }
        if(unpackUrl){
            this.unpackUrl = unpackUrl
        }
                
        this.packClient = new WebSocket(this.packUrl)
        this.packClient.onopen = this.onopen.bind(this)
        this.packClient.onclose = this.onclose.bind(this)
        this.packClient.onmessage = this.onPackMessage.bind(this)


        this.unpackClient = new WebSocket(this.unpackUrl)
        this.unpackClient.onopen = this.onopen.bind(this)
        this.unpackClient.onclose = this.onclose.bind(this)
        this.unpackClient.onmessage = this.onUnpackMessage.bind(this)
    }
    disconnectPolicyManager() {
        if (this.retry) {
            clearInterval(this.retry);
        }
        if (this.packClient) {
            if(this.packClient.readyState === this.packClient.OPEN) {
                this.packClient.onclose = function () {
                    this.packClient.close()
                }
            }
        }
        if (this.unpackClient) {
            if(this.unpackClient.readyState === this.unpackClient.OPEN) {
                this.unpackClient.onclose = function () {
                    this.unpackClient.close()
                }
            }
        }
    }
    onopen (evt) {
        if (this.retry && this.packClient == 1 && this.unpackClient == 1) {
            clearInterval(this.retry)
        }

    }
    onclose (evt) {
        if (!this.retry) {
            this.retry = setInterval(this.connectPolicyManager.bind(this), 4000)
        }
    }
    onPackMessage(evt) {
        bcController.onSystemRequest(this.sysReqParams.policyUpdateFile, this.sysReqParams.urls)
        this.retryCount = 0;
        this.retryTimeout = 0;
        this.policyUpdateRetry();
        
    }
    onUnpackMessage(evt) {
        sdlController.onReceivedPolicyUpdate(evt.data)
    }
    pack(params) {
        this.sysReqParams = params
        this.packClient.send(this.sysReqParams.policyUpdateFile);
    }
    unpack(file) {
        this.unpackClient.send(file)
    }
    policyUpdateRetry() {
        clearTimeout(this.policyUpdateRetryTimer)
        this.policyUpdateRetryTimer = null
        if (this.retryCount < this.sysReqParams.retry.length) {
            console.log("Retry Timeout: " + this.retryTimeout);
            this.retryTimeout = this.retryTimeout + 
                this.sysReqParams.timeout*1000 + 
                this.sysReqParams.retry[this.retryCount] * 1000;
            
            this.policyUpdateRetryTimer = setTimeout(
                function() {
                    bcController.onSystemRequest(this.sysReqParams.policyUpdateFile, this.sysReqParams.urls)
                    this.policyUpdateRetry();
                }.bind(this), this.retryTimeout
            );
            this.retryCount++;
        }
    }
    stopUpdateRetry() {
        clearTimeout(this.policyUpdateRetryTimer)
        this.policyUpdateRetryTimer = null     
        this.retryCount = 0;   
    }
}

let controller = new ExternalPoliciesController()
export default controller