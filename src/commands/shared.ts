import { GridClient, KeypairType, NetworkEnv } from "@threefold2/grid_client";
import { DeploymentModel, IConnectCommandOptions } from "../types";
import { GridCliConfig } from "../config";
import { GridCliLogger } from "../logger";
import { GridLogMessages } from "../logs";
import { capitalize } from "../utils";

/**
 * Creates a new GridClient instance with the provided options.
 *
 * @param options - The options for connecting to the GridClient.
 * @returns A new GridClient instance configured with the specified options.
 */
export const getGrid = (options: IConnectCommandOptions): GridClient => {
  return new GridClient({
    mnemonic: options.mnemonic,
    network: options.network as NetworkEnv,
    keypairType: KeypairType.sr25519,
    storeSecret: options.mnemonic,
    projectName: "GridCli",
  });
};

/**
 * Deploys a deployment using the Grid-CLI tool.
 * Connects to the wallet, updates deployment data, deploys the machines, lists the deployment details, and disconnects.
 * @param deployment - The deployment model to be deployed.
 */
export const deployDeployment = async (deployment: DeploymentModel) => {
  GridCliLogger.info(GridLogMessages.SearchConfigFile);
  const config = new GridCliConfig();
  const options = config.load();
  GridCliLogger.success(GridLogMessages.ConfigFound);

  GridCliLogger.info(GridLogMessages.ConnectingWallet);
  const grid = getGrid(options);
  await grid.connect();
  GridCliLogger.info(GridLogMessages.Connected);

  GridCliLogger.info(GridLogMessages.HandleDeployment);
  for (const machine of deployment.machines) {
    machine.flist = "https://hub.grid.tf/tf-official-apps/base:latest.flist";
    machine.entrypoint = "/sbin/zinit init";
    machine.env = { SSH_KEY: options.SSH_KEY };
  }
  deployment.description = "Deployment deployed using the Grid-CLI tool.";
  GridCliLogger.info(GridLogMessages.DeploymentUpdated);

  GridCliLogger.info(GridLogMessages.Deploying);
  await grid.machines.deploy(deployment);
  GridCliLogger.info(GridLogMessages.Deployed);

  GridCliLogger.info(GridLogMessages.ListDeployment);
  const dValues = await grid.machines.getObj(deployment.name);

  let machines;
  for (const values of dValues) {
    machines = {
      name: values.name,
      nodeId: values.nodeId,
      publicIP: values.publicIP,
      contractId: values.contractId,
      myceliumIP: values.myceliumIP,
      planetary: values.planetary,
      interfaces: values.interfaces,
    };

    console.log("\n");
    GridCliLogger.logTable(
      {
        headers: Object.keys(machines).map(capitalize),
        values: Object.values(machines),
      },
      [10, 10]
    );
  }

  await grid.disconnect();
  GridCliLogger.info(GridLogMessages.Disconnected)
};

/**
 * Generates a random string of a specified length.
 * 
 * @param length - The length of the generated string (default is 7).
 * @returns A randomly generated string consisting of lowercase letters and numbers.
 */
export function generateName(prefix: string, length = 7): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const nums = "0123456789";
  const allChars = chars + nums

  let str = "";

  for (let i = 0; i < length; i++) {
    str += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return prefix + str
}
