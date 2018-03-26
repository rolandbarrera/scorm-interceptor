# scorm-interceptor
A tool that intercepts SCORM and translates it into xAPI statements.

## Table of Contents
* [**Description**](#description)
* [**Installation**](#installation)
* [**Configuration**](#configuration)
  * [LRS](#lrs)
  * [xAPI](#xapi)
  * [SCORM](#scorm)
  * [DEBUGGING](#debugging)

## Description
This project contains a drop in javascript plugin for any SCORM package that will automatically
intercept SCORM statements, convert them to valid xAPI statements, and send them to an LRS.

## Features
* Compatible with xAPI Spec 1.0.3
* Compatible with any SCORM compliant package
* Fully configurable

## Installation
1) First, copy the `lib` directory and the files contained within from this repo into the root of the application you wish to install the scorm-interceptor on.

2) Next, we must include Javascript on the right HTML file. This will depend on what application you are appending the SCORM interceptor to.
For Storyline, look for the index_lms_html5.html file. With Rise, look for index.html. These two lines **must** be included on the HTML file. These lines tell the application to pull in the SCORM interceptor files. 

When adding the script references to the HTML file, add them to the very bottom of the page. Right before the closing body tag (looks like `</body>`).
 
```javascript
<script type="text/javascript" src="lib/scorm-xapi.js"></script>
<script type="text/javascript" src="lib/scorm-interceptor.js"></script>
```

3) Finally, set up the configuration object. This is done in the scorm-interceptor file. Place your configuration settings in this object. [See the section on setting up the configuration object to learn how to do that.](#configuration). Look at the end of the file for the line that says:
```javascript
  var config = {/* CONFIGURATION GOES HERE */};
```

## Configuration

### Sample Configuration Object
```javascript
{
  lrs: {
    endpoint: 'https://example.com/lrs', 
    username: 'exampleUser',
    password: 'examplePassword',
    authKey: ''
  },
  xapi: {
    verbs: {
      defaultVerb: 'interacted',
      map: {
        'cmi.suspend_data': 'interacted'
      }
    },
    agent: {
      defaultAgent: {
        id: 'DEFAULT_AGENT_ID',
        name: 'DEFAULT_AGENT_NAME'
      }
    }
  },
  scorm: {
    setValueFunction: 'SCORM_CallLMSSetValue',
    api: 'SCORM_objAPI'
  },
  debug: true
}
```

  Below are the different ways you can configure the interceptor.

### LRS
```javascript
{
  lrs: {
    endpoint: 'https://example.com/lrs', 
    username: 'exampleUser',
    password: 'examplePassword',
    authKey: ''
  }
}
```

#### Set the lrs endpoint to post xApi statements to

  `config.lrs.endpoint` : string

#### Set the lrs username for authentication

  `config.lrs.username` : string

#### Set the lrs password for authentication

  `config.lrs.password` : string

#### Set the lrs authorization key (overrides username/password)

  `config.lrs.authKey` : string


### xAPI
```javascript
{
  xapi: {
    verbs: {
      defaultVerb: 'interacted',
      map: {
        'cmi.suspend_data': 'interacted'
      }
    },
    agent: {
      defaultAgent: {
        id: 'DEFAULT_AGENT_ID',
        name: 'DEFAULT_AGENT_NAME'
      }
    }
  }
}
```

#### Set the default verb to use when generating xAPI statements

  `config.xapi.verbs.defaultVerb` : string

#### A map of the ScormSetValue elements to xAPI verbs

  `config.xapi.verbs.map` : string

#### Default agent(actor) to use when sending xAPI Statments (only used if an actor cannot be identified automatically)

  `config.xapi.agent.id` : string
  `config.xapi.agent.name` : string

### SCORM
```javascript
{
  scorm: {
    setValueFunction: 'SCORM_CallLMSSetValue',
    api: 'SCORM_objAPI'
  }
}
```

#### Set the Scorm Set Value function that resides in your scorm package (REQUIRED)
 
  This is a required part of the configuration object. This line `setValueFunction: 'SCORM_CallLMSSetValue',`
  should be set to the SetValue function used by the SCORM environment. The value in the sample is a common name
  for the SCORM SetValue function and often works without modification.  

  This function MUST exist for the interceptor to work. You can find this function on the window object
  when you run your scorm package. Look for a function with the "SetValue" name in it. 

  `config.scorm.setValueFunction` : string

#### Set the SCORM API object (Used to access actor information NOT REQUIRED)

  `config.scorm.api` : string
  
### DEBUGGING
  To see additional logs from the SCORM interceptor you can set "debug" to true in the configuration object.
  
```javascript
{
  scorm: {
    setValueFunction: 'SCORM_CallLMSSetValue',
    api: 'SCORM_objAPI'
  },
  debug: true
}
```
  
