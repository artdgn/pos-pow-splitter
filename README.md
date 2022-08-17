# A contract that will transfer ETH / ERC20 / ERC721 on only one fork but not the other

# Deployed:

## PoSPoWSplitter: sending ETH, ERC20, ERC721
- Mainnet: https://etherscan.io/address/0x8e2473d06a8fa554db487c19aec4c3d104583c9e
- Goerli: https://goerli.etherscan.io/address/0x65A2cF7F03296D1FCbFbE359Fb7313af5caa912e

## PosPowMiniEthSplitter: sending ETH only (slim version)
- Mainnet: https://etherscan.io/address/0x9a3919a33295f4ef91ac89d50af7018bdad6c163
- Goerli: https://goerli.etherscan.io/address/0xB5faf1E8Dd29204cEB77F05b70E22495027a1fe9

# Development
1. `yarn install`
2. `yarn test`: run the tests
3. `yarn generate`: generate deployer account
4. `yarn account`: check deployer account balances 
5. `yarn hardhat --network <network> deploy --tags <ContractName>` to deploy. Can also specify `--gasprice` for mainnet (in wei).
6. `yarn hardhat --network <network> etherscan-verify`: verify contract source on etherscan (to be able to interact with it via UI). This requires setting up `.env` file with `ETHERSCAN_API_KEY` (or providing via CLI flags).
