# Frontier Token Subgraph

The subgraph tracks transactions on Frontier token contract on the main network: 0xf8C3527CC04340b208C854E985240c02F7B7793f. It records changes in total supply, transactions, and wallet balances.

## Getting started
Once download the code, run:
```
yarn install
```

## Entities description
Token - stores Frontier address as ID and total supply derived from TotalSupply entity.
TotalSupply - records token total supply. Note, only total supply that's different from previous will be recorded.
Transfer - records transfers on the contract.
Balances - records token balances that own the token.
_LastTokenSupply - helper entity to keep track of last token supply to compare the changes to current token supply.

## Playground
Subgraph playground: [Frontier Token](https://thegraph.com/explorer/subgraph/sercjm/frontier-token?selected=playground).