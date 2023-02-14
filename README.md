
# Multiple chain flash-loan-arbitrage

A solidity and node project to find and take advantage of the arbitrage opportunity between n decentralised exchange on a list of blockchain networks.

## Table of Contents

 - [General Info](#general-info)
 - [Introduction](#introduction)
 - [Project structure](#project-structure)
 - [AAVE](#aave)
 - [Blocknative](#blocknative)
 - [Moralis Web3](#moralis-web3)
 - [Json Server](#json-server)
 - [Smart Contract](#smart-contract)
 - [Scripts](#scripts)
 - [.env](#.env)
 - [truffle-config](#truffle-config.js)
 - [Scheme](#scheme)
 - [Technologies](#technologies)
 - [Setup](#setup)
 - [Test](#test)
 - [Project Status](#project-status)
 - [Links](#-links)
 

## General Info

To understand how this project works, a knowledge of how solidity, blockchains, defi (decentralised finance so UniSwap), Ganache and Truffle is required. 

A local db like json-server, that at the end is just a json file, holds all the data that the program needs to work. You should see this db like a place where the data are stored. There is no relationship between them.

A smart-contract offers various functions. The core function takes a list of routers, which every routers are a decentralised exchange (dex) and a list of tokens. Between every routers the tokens are swapped and at the end it checks if the initial balance is lower the the actual balance. If yes, it perform the swap by borrowing the amount you choose. 
## Introduction

The project is ready-to-use. There is the contract that borrow the tokens that support multiple blockchains. For each blockchains, if they are EVM-compatible (so it has the ethereum virtual machine that can understand the solidity language) the smart contract are the same. The only things that differ are the addresses. So for every db, you just have to fill the proper fields and have a little amount of the currency in your wallet that the blockchains are using to deploy the smart contract. For example, in this project it is used the polygon blockchain because it is really cheap, like also FANTOM or others. Think that one MATIC (the currency used in this blockchain) is more or less one dollar and to deploy the smart contract you will use less than a quarter of this MATIC.

## Project structure

Imagine the project like a big ***lego***. Every piece have his role. Below they will be listed and then explained piece by piece what they are used for and at the end there will be a picture that will sum it all up.

### Uniswap

Uniswap is the contract that every dex (decentralised exchange) is implementing. What that means? That even if we have thousands of dexes, the functions are always the same. His ```getAmountsOut(amount, path)``` function return how many tokens we get by swapping a certain ```amount```. The ```path``` is just the list of address of the tokens involved. So if we have ```[tokenA, tokenB]```, the function will return for the dex that is applied how many ```tokenB``` I will get by swapping ```amount``` of ```tokenA```.

The other core funtion is ```swapExactTokensForTokens(...)``` that it is self explanatory.

The mind process is: I want to swap A for B, B for C, and C for A between three routers (because the tokens in this example are three) and check if A it is higher; if yes swap, otherwise try another combination of tokens and routers. Of course you can use any number of routers and tokens. For example in this project I used five routers. The important thing is that I'm starting with a token, and I'm finishing with the same so if there will be an arbitrage opportunity the returned token is higher than before.

The Uniswap version used is V2. Check here for more details [UniSwap V2](https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02).

### AAVE

The AAVE programmers develop a smart-contract that allowed anyone to borrow big quantity of tokens. Thanks to ```IFlashLoanSimpleReceiver``` implemented to your contract, the functions inherited gives you the tools to execute the loan; ```flashLoanSimple(...)``` was used. More info [AAVE V3](https://docs.aave.com/developers/core-contracts/pool#flashloansimple).

### Blocknative

Blocknative offers an API to estimate the gas price in the ethereum and in the polygon network. For other blockchain you can use a static value for the gas price or estimate by yourself with other tools. Inside ```/scripts/Utils.js``` the function ```calculateGasPrice(...)``` is using the API. To use this tool, you must have an account and get the key created for your user. More info on [Blocknative](https://docs.blocknative.com/gas-platform).

### Moralis Web3

Moralis Web3 offers an API to estimate the price of a token by analyzing the blocks of the most used dex on that blockchain. The list of blockchain supported are: polygon, ethereum, arbitrum, avalanche, fantom. For the harmony and optimism blockchain, you have to use another tools. More info on [Moralis Web3](https://docs.moralis.io/web3-data-api/evm/how-to-get-the-price-of-an-erc20-token).

### json-server

It is a local db. The ```/scripts/CRUDOperations.js``` contains the functions to interact with it. Every db is relate to a blockchain. It has the following fields:
    
* **addresses**: this contains all the addresses to fetch what you need. ***AAVEPoolV3*** is the AAVE V3 Pool smart-contract that your smart-contract is requesting for the loan; ***AAVEPoolAddressProviderV3*** is the smart-contract that your smart-contract must implement to use the AAVE tools (check AAVE above for more info); ***ownerMainnetAddress*** is your MetaMask address used to deploy the smart-contract; ***arbContract*** is the address of the smart-contract after the deploy (you don't have to touch it because after you deploy with Truffle, in the section below it is explained, this field is automatically updated); 
* **tradeInfos**: it has the info needed to execute the trade; ***minBasisPoint*** indicates how much in percentage you want to gain from a trade; for example if the ***minBasisPoint*** is 100, it means that the amount you are swapping must exceed 1% of the initial value; ***gasPrice*** is used whenever you use a function of the smart-contract; it is updated when ```calculateGasPrice(...)``` is used, but just on the ethereum and polygon network; if you don't know which value to put, just search the blockchain name + gas estimator; ***treshold*** it is the balance that you don't want to be under; when you are executing the trade, normally the machine is working for days; it can happen that after a lot of trades your balance will be drain so with this you are managing this event;
* **routers**: is a list; they are the routers so the dex where your swapping is operating; every element has this structure: ```{dex: nameOfTheDex, address: addressOfDex}```;
* **asset**: is a list; they are just tokens but they are called asset because they are the tokens that you are swapping at the beginning; so the list must conform to the list that the AAVE flash-loan is providing; **in the later sections there will be all the commands to get easily what you need without coding**; any element have this structure: ```{symbol: symbolOfToken, decimals: decOfToken, address: addrOfToken}```;
* **token**: is a list; they are the token that you are swapping in the middle; if you don't know which token to use you can just re-use the asset list; the element structure are the same of the **asset**;
* **tokenPrices**: is the list of your **asset** tokens with their usd price; **in the later sections there will be all the commands to get easily what you need without coding**;

To understand better the db structure just check the ```polygon.json``` file.

Inside the ***package.json*** file under ***scripts*** there is all the info on how to open the db. For example for the ***polygon.json*** the command is ```npm run polygon_server``` and on port localhost:8001 the db is waiting to serve.

### Smart-Contract

The ```FlashLoanArbitrage``` smart-contract I implemented is simple:

* the **guardians** manage who can access which function;
* ```triangularArbitrageWithFlashLoan(...)``` is the function called to execute the flash-loan and the swap;
* ```estimateTrade(...)``` is the function to estimate the trade and check if there will be a profit;
* ```recoverEth(...)``` will transfer the balance of the contract to the caller;
* ```recoverTokens(...)``` will transfer the token balance of the contract to the caller;

The ```WETH9``` smart-contract is used to have the ```ABI``` to interact to any kind of token.

The ```UniswapV2Router``` is used to execute the tests (see section [Test](#test)).

The ```Interfaces```, ```DataTypes``` and ```FlashLoanSimpleReceiverBase``` are used to interact with the AAVE Pool contract.

### Scripts

The scripts provided will be explained even if thanks to the ```/executables``` directory, you can just copy paste the command to use them, so in theory is not important to understand what they are doing.

* **loadAsset.js** : it will save the **asset** list of tokens that the AAVE flash-loan can borrow;
* **saveTokenPrices.js** : it is self-explanatory; the only problem is that for the blockchain ***Harmony*** and ***Optimism*** the API is not provided; you should find another way;
* **sendMoney.js** : it can happen that you want to test first the project before deploy any smart-contract and use real money but in the test network there aren't all the routers you want to use for your swap; same for tokens; that's why a knowledge of ***Ganache*** is require; later on in the setup section it is explained what to do; just know that you can fork the blockchain so you can use how many fake money you want on the real blockchain; the goal of this script is to increase the balance of your wallet to allow you to deploy and use all the functions of the smart-contract;
* **trade.js** : it is the script that put all togheter all the ***lego*** pieces to find the arbitrage opportunity and perform the flashloan arbitrage;
* **balances.js** : it will print the balance of every asset of the owner and of the smart-contract;
* **recoverTokens.js** : it will transfer all the tokens balance from the smart-contract to the owner;
* **recoverEth.js** : it will transfer the balance of the contract to the owner;


### .env

This is the file that contains the keys used in the projects that you must fill. This file should not be visible for others. Inside the ```.gitignore``` always check if this file is inside.

* **INFURA_POLYGON**: Infura is a reliable blockchain node service provider which helps you run blockchain nodes without the hardware and other requirements for maintaining the node. After sign-up you have to create the key to use his services and fill this field with that key. The use-case in this project is to use the fork network of the blockchain you are working with; it supports polygon, ethereum, arbitrum, avalanche and optimism blockchain; for fantom and harmony you have to use another service;
* **MNEMONICS**: to sign with your accounts the transactions;
* **MORALIS_KEY**: to get the price of the tokens; you have to sign-up and create the key to use this tools; check the sections above;
* **BLOCKNATIVE_KEY**: to get the price of the gas (ethereum and polygon are only supported since this project is uploaded); you have to sign-up and create the key to use this tools; check the sections above;

### truffle-config.js

Inside ```networks``` there are the networks that you can connect to. The pattern are: ***nameOfBlockchain***, ***ganache_nameOfBlockchain***, ***ganache_nameOfBlockchain_with_fake_accounts***.

The ***nameOfBlockchain*** is used to deploy and interact with the real blockchain.

The ***ganache_nameOfBlockchain*** is used to interact with the forked network by using your account.

The ***ganache_nameOfBlockchain_with_fake_accounts*** is used to interact with the forked network by using the fake accounts provided by ganache so you can transfer every amount of currency to your account.

**NOTE**: remember to change the port when you are using a new blockchain and the ***ganache_nameOfBlockchain*** and the ***ganache_nameOfBlockchain_with_fake_accounts*** must have the same port.

### Scheme

![](project_scheme.PNG)

        
## Technologies
- Node 14.17.4
- Ganache 7.5.0
- Solidity 8.0.*
- Web3.js 1.7.4
- Truffle 5.5.30
## Setup

* In [Technologies](#technologies) there are the version of ```node```, ```truffle``` and ```ganache``` that is recommended to install;
* Clone this repository, execute an ```npm install```;
* Create the ```.env``` file; inside the folder of this project copy and paste the following commands: 
```
$ touch .env
$ echo ".env" >> .gitignore
```
* Inside the ```.env``` file, copy, paste and fill the following fields (check [.env](#.env) section for more details):
```
INFURA_POLYGON=
MNEMONICS=
MORALIS_KEY=
BLOCKNATIVE_KEY=
```
* On a prompt window open the db by typing ```npm run polygon_server``` (check package.json under scripts to see the commands to watch the db);
* Inside the db, under the field ***ownerMainnetAddress*** put the address that you are using to deploy the contract;
#### Forknet
From here the steps are intended to make you try first on a forked network to get used with the project. Every operation it is not updating any data in the real blockchain.
* On another prompt windows execute the command ```ganache-cli --port 8545 --fork <INFURA_KEY>``` where ```8545``` have to be the same port used for the blockchain networks (check ```truffle-config.js``` under ```ganache_polygon``` and ```ganache_polygon_with_fake_accounts```); the ```INFURA_KEY``` is the ```INFURA_POLYGON``` present inside the ```.env``` file; for each blockchain you have to create another key and another field inside ```.env``` and make the ```truffle-config.js``` pointing the same key; to understand if the command went through, you have to see like a list of accounts and on which port in running;
* Inside ```executables/increase_balanche.sh``` update ```<networkWithFakeAccountsName>``` with the ```networks``` that are present inside ```truffle-config.js``` under ```networks``` section, the network that match the pattern ***ganache_nameOfBlockchain_with_fake_accounts*** so since now ```ganache_polygon_with_fake_accounts```; execute it and after a few seconds your balance should be increased by 10 ether;
* Inside ```/executables/deploy_contract.sh``` update ```<networkName>``` with the ```networks``` that are present inside ```truffle-config.js``` under ```networks``` section, the network that match the pattern ***ganache_nameOfBlockchain*** so since now ```ganache_polygon```; execute it and after a few seconds the contract should be deployed;
* Inside ```/executables/flash_loan_arbitrage_trade.sh``` update ```<networkName>``` with the ```networks``` that are present inside ```truffle-config.js``` under ```networks``` section, the network that match the pattern ***ganache_nameOfBlockchain*** so since now ```ganache_polygon```; after his execution, the flash-loan-arbitrage is starting to find the arbitrage opportunity; a ```console.table``` shows what the program is doing; read the docs inside ```trade.js```; because it can happen that during the day the connection could be loss, inside ```/executables/trade.sh``` there is an example to avoid this issue; the command are the same as ```/executables/flash_loan_arbitrage_trade.sh```, but between a command and another there is the ```||``` (or operator), so in case the first command fails, the second is executed; copy and paste how many times you want the commands inside that file to never face a connection lost;

#### Realnet

* On a real network the steps are easier; you need only to have some MATIC in your polygon blockchain account (just one is enough);
* The steps are the same before the [Forknet](#forknet) steps;
* Inside ```/executables/deploy_contract.sh``` update ```<networkName>``` with the ```networks``` that are present inside ```truffle-config.js``` under ```networks``` section, the network that match the pattern ***nameOfBlockchain*** so since now ```polygon```; execute it and after a few seconds the contract should be deployed; sometimes it can take even 30 min; don't do my mistakes to execute multiple time that command; it will deploy every time a new contract; wait even one hour; check your address transactions to be sure;
* Inside ```/executables/flash_loan_arbitrage_trade.sh``` update ```<networkName>``` with the ```networks``` that are present inside ```truffle-config.js``` under ```networks``` section, the network that match the pattern ***nameOfBlockchain*** so since now ```polygon```; after his execution, the flash-loan-arbitrage is starting to find the arbitrage opportunity; a ```console.table``` shows what the program is doing; read the docs inside ```trade.js```; because it can happen that during the day the connection could be loss, inside ```/executables/trade.sh``` there is an example to avoid this issue; the command are the same as ```/executables/flash_loan_arbitrage_trade.sh```, but between a command and another there is the ```||``` (or operator), so in case the first command fails, the second is executed; copy and paste how many times you want the commands inside that file to never face a connection lost;

**NOTE**: **every time you are deploying, in a fork network or not, the ***arbContract*** inside the db (```polygon.json```) is updated, so if you want to use the real network check this field if correspond to the real address in the real network.**

#### Utils

Here are listed the scripts to interact with the contract. On each command the ```<networkName>``` must be update with the ```networks``` that are present inside ```truffle-config.js``` under ```networks``` section, the network that match the pattern ***nameOfBlockchain*** or ***ganache_nameOfBlockchain*** so since now ```polygon``` or ```ganache_polygon```.

* ```/executables/get_balances_of_tokens.sh``` will print the balance of the tokens of the contract and of the owner;
* ```/executables/transfer_from_contract_to_owner.sh``` will transfer the tokens balance of the contract to the owner;
* ```/executables/transfer_eth_from_contract_to_owner.sh```  will transfer the eth balance of the contract to the owner;
* ```truffle exec scripts/save_token_prices.sh --network <networkName>``` will save inside the db under the field ***tokenPrices*** the price of each token; check [Moralis Web3](#moralis-web3) to see which blockchain is supported;
* ```truffle exec scripts/save_asset.sh --network <networkName>``` will save inside the db under the field ***asset*** all the tokens that you can borrow;




## Test

* Open the db;
* Open a prompt, execute ```ganache-cli --fork <infura-key>```;
* Increase your balance by executing ```/executables/increase_balance.sh``` (remember to update <networkName>);
* Unskip all the tests;
* Comment ```require(endBalance > startBalance, "Trade Reverted, No Profit Made");``` inside ```triangularDexArb(...)``` because you can't see the result of a function that is reverting his operations;
* run ```truffle test --network <networkName>```;
* the ***arbContract*** field in the db will be updated because every time you run the tests a new contract is deployed; if you are working on a forked network, migrate everytime the contracts so the address will be updated; if you are working on a real network, check always that this field correspond to the real address;
## Project status

The idea behind this project is to allow an easy access to this world to the people interested to defi, solidity and web3 project, to start from a base where you can build your own strategy but also a challenge for myself to improve my skills and to share my ideas.

The project is not finished yet. A few functionalities are necessary to have an excellent result. 

I'm working for a functionality to avoid the sandwich-attack where the people are taking advantage of your trade to gain on you. If the arbitrage opportunity is highly profitable, so is the competition. A private transaction can resolve this problem, so the operation is not visible in the mempool.

Another functionality is to find a way to search the arbitrage opportunity only between pairs that have high reserves.
## 🔗 Links
[![portfolio](https://img.shields.io/badge/my_portfolio-000?style=for-the-badge&logo=ko-fi&logoColor=white)](https://github.com/LVisir)
[![linkedin](https://img.shields.io/badge/linkedin-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/edoardo-mariani-2903a5262/)

