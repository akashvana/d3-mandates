import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { SessionKeyManagerModule, DEFAULT_SESSION_KEY_MANAGER_MODULE  } from "@biconomy/modules";
import { BiconomySmartAccountV2 } from "@biconomy/account"
import { defaultAbiCoder } from "ethers/lib/utils";
import ERC20Transfer from "./ERC20Transfer";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface props {
  smartAccount: BiconomySmartAccountV2;
  address: string;
  provider: ethers.providers.Provider;
}

const CreateSession: React.FC<props> = ({ smartAccount, address, provider }) => {
  const [isSessionKeyModuleEnabled, setIsSessionKeyModuleEnabled] = useState<boolean>(false);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  useEffect(() => {
    let checkSessionModuleEnabled = async () => {
      if(!address || !smartAccount || !provider) {
        setIsSessionKeyModuleEnabled(false);
        return
      }
      try {
        const dcaSessionValidationModule = "0x4559f7f0985c761d991B52a03Bd9c32857F73AeD"
        const isEnabled = await smartAccount.isModuleEnabled(DEFAULT_SESSION_KEY_MANAGER_MODULE)
        console.log("isSessionKeyModuleEnabled", isEnabled);
        setIsSessionKeyModuleEnabled(isEnabled);
        return;
      } catch(err: any) {
        console.error(err)
        setIsSessionKeyModuleEnabled(false);
        return;
      }
    }
    checkSessionModuleEnabled()
  },[isSessionKeyModuleEnabled, address, smartAccount, provider])

  const createSession = async (enableSessionKeyModule: boolean) => {
    toast.info('Creating Session...', {
      position: "top-right",
      autoClose: 15000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      });
    if (!address || !smartAccount || !provider) {
      alert("Please connect wallet first")
    }
    try {
      const dcaSessionValidationModule = "0x4559f7f0985c761d991B52a03Bd9c32857F73AeD"
      // -----> setMerkle tree tx flow
      // create dapp side session key
      const sessionSigner = ethers.Wallet.createRandom();
      const sessionKeyEOA = await sessionSigner.getAddress();
      console.log("sessionKeyEOA", sessionKeyEOA);
      // BREWARE JUST FOR DEMO: update local storage with session key
      window.localStorage.setItem("sessionPKey", sessionSigner.privateKey);

      // generate sessionModule
      const sessionModule = await SessionKeyManagerModule.create({
        moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
        smartAccountAddress: address,
      });

      const daysAfter = localStorage.getItem('numberOfDays')
      console.log("days after: ", daysAfter)
      // create session key data
      const sessionKeyData = defaultAbiCoder.encode(
        ["address", "uint256"],
        [
          sessionKeyEOA, // erc20 token address
          daysAfter
        ]
      );

      const sessionTxData = await sessionModule.createSessionData([
        {
          validUntil: 0,
          validAfter: 0,
          sessionValidationModule: dcaSessionValidationModule,
          sessionPublicKey: sessionKeyEOA,
          sessionKeyData: sessionKeyData,
        },
      ]);
      console.log("sessionTxData", sessionTxData);

      // tx to set session key
      const setSessiontrx = {
        to: DEFAULT_SESSION_KEY_MANAGER_MODULE, // session manager module address
        data: sessionTxData.data,
      };

      const transactionArray = [];

      if (enableSessionKeyModule) {
        // -----> enableModule session manager module
        const enableModuleTrx = await smartAccount.getEnableModuleData(
          DEFAULT_SESSION_KEY_MANAGER_MODULE
        );
        transactionArray.push(enableModuleTrx);
      }

      transactionArray.push(setSessiontrx)

      let partialUserOp = await smartAccount.buildUserOp(transactionArray);

      const userOpResponse = await smartAccount.sendUserOp(
        partialUserOp
      );
      console.log(`userOp Hash: ${userOpResponse.userOpHash}`);
      const transactionDetails = await userOpResponse.wait();
      console.log("txHash", transactionDetails.receipt.transactionHash);
      setIsSessionActive(true)
      toast.success(`Success! Session created succesfully`, {
        position: "top-right",
        autoClose: 18000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        });
    } catch(err: any) {
      console.error(err)
    }
  }
  return (
    <div>
      <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
      />
      {isSessionKeyModuleEnabled ? (
      <button onClick={() => createSession(false)} >Create Session</button>
      ) : (
        <button onClick={() => createSession(true)} >Enable and Create Session</button>
      )}
      {/* {isSessionActive && <ERC20Transfer smartAccount={smartAccount} provider={provider} address={address} />} */}
    </div>
    
  )
}

export default CreateSession;