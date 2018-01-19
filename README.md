# load-generator

Tool helps to generate load for RHMAP components in OpenShift and monitor their resouce usage.

## Prerequisites

* node version >= 7.6.0
* oc client
* `npm install`
* `oc login <url>`
* `oc project <rhmap_core_project>`

## Example

`npm start -- --component fh-aaa -c 100 -n 1000`

## Usage

```
Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --component        RHMAP component to load test                     [required]
  -c, --concurrency  Concurrency of Users                           [default: 1]
  -n, --numUsers     Number of Users (number of total runs)         [default: 1]
  -r, --rampUp       Ramp up time to Concurrency of Users (in seconds)
                                                                    [default: 1]
```
