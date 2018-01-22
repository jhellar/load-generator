# load-generator

Tool helps to generate load for RHMAP components in OpenShift and monitor their resouce usage.

## Prerequisites

* node version >= 7.6.0
* oc client
* `npm install`
* `oc login <url>`
* `oc project <rhmap_core/mbaas_project>`

## Example

`npm start -- --component fh-aaa -c 100 -n 1000`

If you want to test mbaas component, use `--coreProject` to specify name of OpenShift project wirh RHMAP core. It is used to get RHMAP credentials.

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
  -i, --monInterval  Monitor interval                               [default: 1]
  -p, --coreProject  Name of OpenShift project with RHMAP core     [default: ""]
```
