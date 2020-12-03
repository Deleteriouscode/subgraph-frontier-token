import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { Frontier, Transfer } from "../generated/Frontier/Frontier";
import {
	Token,
	TokenSupply,
	_LastTokenSupply,
	Transfer as TransferEntity,
} from "../generated/schema";
import { convertToDecimal, toDecimalExponent } from "./utils";

function saveTokenSupply(
	tokenSupplyId: string,
	totalSupplyVal: BigDecimal,
	event: Transfer,
	token: Token | null,
	prevTokenSupply: _LastTokenSupply | null
): void {
	let tokenSupply = new TokenSupply(tokenSupplyId);
	tokenSupply.totalSupply = totalSupplyVal;
	tokenSupply.timestamp = event.block.timestamp;
	tokenSupply.token = token.id;
	tokenSupply.save();
	prevTokenSupply._totalSupply = totalSupplyVal;
	prevTokenSupply.save();
}

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

export function handleTransfer(event: Transfer): void {
	// record totalSupply changes
	// get current total supply
	let contract = Frontier.bind(event.address);
	let totalSupplyVal: BigDecimal;
	let tokenId = event.address.toHex();
	let totalSupply = contract.totalSupply();
	let decimals = contract.decimals();
	let decimalsTotal = toDecimalExponent(BigInt.fromI32(decimals));
	let decimalTotalSupply = convertToDecimal(totalSupply, decimalsTotal);
	totalSupplyVal = decimalTotalSupply;
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
	let transfer = new TransferEntity(transferId);
	transfer.from = event.params.from.toHex();
	transfer.to = event.params.to.toHex();
	transfer.amount = convertToDecimal(event.params.value, decimalsTotal);
	transfer.timestamp = timestamp;
	// date methods are not supported in AS
	// let date = new Date(timestamp.toI32());
	// transfer.date = date.toLocaleDateString("en-US");
	transfer.save();
}
