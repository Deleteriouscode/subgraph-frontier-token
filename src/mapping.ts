import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { Frontier, Transfer } from "../generated/Frontier/Frontier";
import {
	Token,
	TokenSupply,
	_LastTokenSupply,
	Transfer as TransferEntity,
	Balance,
} from "../generated/schema";
import { convertToDecimal, toDecimalExponent } from "./utils";

function initToken(
	tokenId: string,
	tokenSupplyId: string,
	totalSupplyVal: BigDecimal,
	event: Transfer,
	token: Token | null
): void {
	token = new Token(tokenId);
	token.save();
	let prevTokenSupply = new _LastTokenSupply(tokenId);
	saveTokenSupply(
		tokenSupplyId,
		totalSupplyVal,
		event,
		token,
		prevTokenSupply
	);
}

function initBalance(address: string) {
	let balance = Balance.load(address);
	if (balance === null && !address.startsWith("0x000000")) {
		balance.id = address;
		balance.amount = BigDecimal.fromString("0");
		balance.save();
	}
}

function saveTokenSupply(
	tokenSupplyId: string,
	totalSupplyVal: BigDecimal,
	event: Transfer,
	token: Token | null,
	prevTokenSupply: _LastTokenSupply | null
): void {
	// record totalSupply changes
	let tokenSupply = new TokenSupply(tokenSupplyId);
	tokenSupply.totalSupply = totalSupplyVal;
	tokenSupply.timestamp = event.block.timestamp;
	tokenSupply.token = token.id;
	tokenSupply.save();
	prevTokenSupply._totalSupply = totalSupplyVal;
	prevTokenSupply.save();
}

function saveTransaction(
	transferId: string,
	fromAddress: string,
	toAddress: string,
	transferAmount: BigDecimal,
	timestamp: BigInt
): void {
	let transfer = new TransferEntity(transferId);
	transfer.from = fromAddress;
	transfer.to = toAddress;
	transfer.amount = transferAmount;
	transfer.timestamp = timestamp;
	// date methods are not supported in AS
	// let date = new Date(timestamp.toI32());
	// transfer.date = date.toLocaleDateString("en-US");
	transfer.save();
}

function saveBalance(
	fromAddress: string,
	toAddress: string,
	transferAmount: BigDecimal
): void {
	initBalance(fromAddress);
	initBalance(toAddress);

	let fromBalance = Balance.load(fromAddress);
	let toBalance = Balance.load(toAddress);

	if (fromBalance !== null) {
		fromBalance.amount = fromBalance.amount.minus(transferAmount);
	}
	if (toBalance !== null) {
		toBalance.amount = toBalance.amount.plus(transferAmount);
	}
	fromBalance.save();
	toBalance.save();
}

export function handleTransfer(event: Transfer): void {
	let contract = Frontier.bind(event.address);
	let totalSupplyVal: BigDecimal;
	let tokenId = event.address.toHex();
	let fromAddress = event.params.from.toHex();
	let toAddress = event.params.to.toHex();

	let totalSupply = contract.totalSupply();
	let decimals = contract.decimals();
	let decimalsTotal = toDecimalExponent(BigInt.fromI32(decimals));
	let decimalTotalSupply = convertToDecimal(totalSupply, decimalsTotal);
	totalSupplyVal = decimalTotalSupply;
	let transferAmount = convertToDecimal(event.params.value, decimalsTotal);
	let timestamp = event.block.timestamp;

	// load token
	let token = Token.load(tokenId);
	let transferId = event.transaction.hash.toHex();

	// in initial, instantiate a new token entity
	if (!token) {
		initToken(tokenId, transferId, totalSupplyVal, event, token);
	} else {
		// otherwise, update supply if changed from previous record
		let prevTokenSupply = _LastTokenSupply.load(tokenId);

		if (prevTokenSupply._totalSupply != totalSupplyVal) {
			saveTokenSupply(
				transferId,
				totalSupplyVal,
				event,
				token,
				prevTokenSupply
			);
		}
	}

	// record transaction
	saveTransaction(
		transferId,
		fromAddress,
		toAddress,
		transferAmount,
		timestamp
	);

	// record balance
	saveBalance(fromAddress, toAddress, transferAmount);
}
