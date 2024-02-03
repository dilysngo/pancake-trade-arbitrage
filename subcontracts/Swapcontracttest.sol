// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.6.6 <0.8.0;

import './utils/Ownable.sol';
import './UniswapV2Library.sol';
import './interfaces/IERC20.sol';
import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IUniswapV2Factory.sol';
import './interfaces/IUniswapV2Router02.sol';

contract Swapcontracttest is Ownable {
    // https://testnet.bscscan.com/address/0xD99D1c33F9fC3444f8101754aBC46c52416550D1#code
    address private constant pancakeRouter = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
    // https://testnet.bscscan.com/address/0x094616f0bdfb0b526bd735bf66eca0ad254ca81f
    address private constant WBNB = 0x094616F0BdFB0b526bD735Bf66Eca0Ad254ca81F;

    constructor() {}

    function startSwap(
        address token0,
        address token1,
        uint amount0,
        uint amount1
    ) external {
        // transfer input tokens to this contract address
        IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        // approve pancakeRouter to transfer tokens from this contract
        IERC20(token0).approve(pancakeRouter, amount0);

        address[] memory path;
        if (token0 == WBNB || token1 == WBNB) {
            path = new address[](2);
            path[0] = token0;
            path[1] = token1;
        } else {
            path = new address[](3);
            path[0] = token0;
            path[1] = WBNB;
            path[2] = token1;
        }

        IUniswapV2Router02(pancakeRouter).swapExactTokensForTokens(
            amount0,
            amount1,
            path,
            msg.sender, // or address(this), and transfer the swapped token to msg.sender
            block.timestamp + 60
        );
    }

    function destruct() public onlyOwner {
        address payable owner = payable(owner());
        selfdestruct(owner);
    }

    receive() external payable {}
}

