# Contributing to Node-RED

We welcome contributions, but request you follow these guidelines.

## Raising issues

Please raise any bug reports on the project's 
[issue tracker](https://github.com/node-red/node-red/issues?state=open). Be sure to
search the list to see if your issue has already been raised.

A good bug report is one that make it easy for us to understand what you were
trying to do and what went wrong.

Provide as much context as possible so we can try to recreate the issue.
If possible, include the relevant part of your flow. To do this, select the
relevant nodes, press Ctrl-E and copy the flow data from the Export dialog.

At a minimum, please include:

 - Version of Node-RED - either release number if you downloaded a zip, or the first few lines of `git log` if you are cloning the repository directly.
 - Version of node.js - what does `node -v` say?


## New features

For feature requests, please raise them on the [mailing list](https://groups.google.com/forum/#!forum/node-red).

## Pull-Requests

### Changes to existing code
if you want to raise a pull-request with a new feature, or a refactoring
of existing code, it may well get rejected if you haven't discussed it on 
the [mailing list](https://groups.google.com/forum/#!forum/node-red) first.

### New nodes

The plugin nature of Node-RED means anyone can create a new node to extend
its capabilities.

We want to avoid duplication as that can lead to confusion. Many of our existing
nodes offer a starting point of functionality. If they are missing features,
we would rather extend them than add separate 'advanced' versions. But the key
to that approach is getting the UX right to not lose the simplicity.

To contribute a new node, please raise a pull-request against the 
`node-red-nodes` repository.

Eventually, the nodes will be npm-installable, but we're not there yet. We'll
also have some sort of registry of nodes to help with discoverability.

### Coding standards

Please ensure you follow the coding standards used through-out the existing
code base. Some basic rules include:

 - all files must have the Apache license in the header.
 - indent with 4-spaces, no tabs. No arguments.
 - opening brace on same line as `if`/`for`/`function`/etc, closing brace on its
   own line.

### Contributor License Aggreement

In order for us to accept pull-requests, the contributor must first complete
a Contributor License Agreement (CLA). This clarifies the intellectual 
property license granted with any contribution. It is for your protection as a 
Contributor as well as the protection of IBM and its customers; it does not 
change your rights to use your own Contributions for any other purpose.

You can download the CLAs here:

 - [individual](http://nodered.org/cla/node-red-cla-individual.pdf)
 - [corporate](http://nodered.org/cla/node-red-cla-corporate.pdf)

If you are an IBMer, please contact us directly as the contribution process is
slightly different.







