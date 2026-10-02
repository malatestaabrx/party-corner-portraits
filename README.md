# Party Corner Portraits

Party Corner Portraits is a Foundry VTT module that displays your party’s character portraits in a corner of the interface. It lets you customize their size, position, framing, orientation, names, and border color, while also allowing quick access to each character sheet by clicking their portrait.

## Compatibility

| Module version | Foundry VTT |
| --- | --- |
| 1.2.0 | 11 |
| 2.1.0 | 13 |

## Installation

In Foundry VTT, open **Add-on Modules → Install Module** and use the appropriate manifest URL:

- Foundry VTT 11: `https://raw.githubusercontent.com/malatestaabrx/party-corner-portraits/main/manifests/module-v11.json`
- Foundry VTT 13: `https://raw.githubusercontent.com/malatestaabrx/party-corner-portraits/main/manifests/module-v13.json`

Then enable **Party Corner Portraits** in your world and open **Game Settings → Configure Settings → Module Settings → Configure Portraits**.

## Source code

- `party-corner-portraits-v11/party-corner-portraits`: Foundry VTT 11 version.
- `party-corner-portraits-v13/party-corner-portraits`: Foundry VTT 13 version.

## Bug reports and suggestions

Use the [issue tracker](https://github.com/malatestaabrx/party-corner-portraits/issues).

## Publishing releases to Foundry VTT

The repository includes a manual GitHub Actions workflow named **Publish release to Foundry VTT**. Add the package release token from the Foundry package management page as a repository Actions secret named `FOUNDRY_RELEASE_TOKEN`.

Run the workflow with **Validate without publishing** enabled first. If validation succeeds, run it again with that option disabled. Select Foundry 11 to register module version 1.2.0 or Foundry 13 to register module version 2.1.0. Wait at least 60 seconds between requests.
