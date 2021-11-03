import { useState } from 'react';
import Big from 'big.js';
import { useSnackbar } from 'notistack';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import Button from '~/components/Button';
import type { InputData } from '~/components/Dialog/DialogDelegation';
import DialogDelegation from '~/components/Dialog/DialogDelegation';
import DialogValidatorList from '~/components/Dialog/DialogValidatorList';
import DialogWithdrawReward from '~/components/Dialog/DialogWithdrawReward';
import { useChainSWR } from '~/hooks/useChainSWR';
import { useCurrentChain } from '~/hooks/useCurrentChain';
import { divide, gt, plus, pow, times } from '~/utils/calculator';

import styles from './index.module.scss';

type MyDelegationProps = {
  className?: string;
};

export default function MyDelegation({ className }: MyDelegationProps) {
  const { data, swr } = useChainSWR();
  const currentChain = useCurrentChain();
  const { enqueueSnackbar } = useSnackbar();

  const [delegationData, setDelegationData] = useState<{ open: boolean; inputData: InputData }>({
    open: false,
    inputData: {
      type: 'delegate',
      validatorAddress: '',
    },
  });

  const [validatorListData, setValidatorListData] = useState({ open: false, validatorAddress: '' });

  const [withdrawRewardData, setWithdrawRewardData] = useState<{
    open: boolean;
    validatorAddress: string[];
    amount: string;
    title: string;
    description?: string;
  }>({
    open: false,
    validatorAddress: [],
    amount: '',
    title: '',
  });

  const delegation = swr.delegations.data;
  const reward = swr.rewards.data;

  const { validators, validValidatorsTotalToken } = data;

  if (!delegation?.result?.length || !reward?.result || !validators.length) {
    return null;
  }

  const rewardList =
    swr.rewards.data?.result?.rewards?.map((item) => ({
      validatorAddress: item.validator_address,
      reward:
        item?.reward
          ?.filter((rewardItem) => rewardItem.denom === currentChain.denom)
          ?.reduce((ac, cu) => plus(ac, cu.amount), '0') || '0',
    })) || [];

  const sortedRewardList = rewardList.sort((a, b) => (gt(b.reward, a.reward) ? 1 : -1)).slice(0, 10);

  const getRewardAmount = (validatorAddress: string[]) =>
    times(
      rewardList
        .filter?.((item) => validatorAddress.includes(item.validatorAddress))
        .map((item) => item?.reward)
        .reduce((ac, cu) => plus(ac, cu), '0') || '0',
      pow(10, -currentChain.decimal),
      currentChain.decimal,
    );

  return (
    <div className={className}>
      <div className={styles.titleContainer}>
        <div className={styles.title}>나의 위임내역</div>
        <div className={styles.titleButtonContainer}>
          <Button>이자 지급 주소 변경</Button>
          <Button
            onClick={() => {
              const validatorAddress = sortedRewardList.map((item) => item.validatorAddress);

              const rewardAmount = getRewardAmount(validatorAddress);

              if (gt(currentChain.fee.default, rewardAmount)) {
                enqueueSnackbar('요청할 이자가 Tx 수수료보다 낮습니다.', { variant: 'error' });
                return;
              }

              setWithdrawRewardData({
                open: true,
                validatorAddress,
                amount: rewardAmount,
                title: '이자 모두 받기',
                description: '이자 수량이 높은 순으로 한 번에 최대 10개의 검증인에게 이자를 요청할 수 있습니다.',
              });
            }}
          >
            이자 모두 받기
          </Button>
        </div>
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#fafafa' }}>
              <TableCell align="center" sx={{ fontSize: '1.4rem' }}>
                검증인
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '1.4rem' }}>
                총 위임량
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '1.4rem' }}>
                검증인 수수료
              </TableCell>
              <TableCell align="center" sx={{ fontSize: '1.4rem' }}>
                내가 위임한 수량
              </TableCell>
              <TableCell align="center" sx={{ fontSize: '1.4rem' }}>
                이자
              </TableCell>
              <TableCell align="center" sx={{ fontSize: '1.4rem' }} width="20%">
                위임
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {delegation.result.map((item, idx) => {
              const validatorInfo = validators.find(
                (validatorItem) => validatorItem.operator_address === item.delegation.validator_address,
              );

              const rewardInfo = reward.result.rewards.find(
                (rewardItem) => rewardItem.validator_address === item.delegation.validator_address,
              );

              return (
                <TableRow
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  sx={{
                    '&:nth-of-type(even)': {
                      backgroundColor: '#fafafa',
                    },
                  }}
                >
                  <TableCell align="left" sx={{ fontSize: '1.4rem' }}>
                    <div className={styles.validatorContainer}>
                      <div className={styles.validatorImgContainer}>
                        <img
                          src={`https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/moniker/${
                            currentChain.validatorIconDirectory
                          }/${validatorInfo!.operator_address}.png`}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = 'https://www.mintscan.io/static/media/validator_none.f01f85a0.svg';
                          }}
                        />
                      </div>
                      <a
                        href={`https://www.mintscan.io/${currentChain.mintscanPath}/validators/${
                          validatorInfo!.operator_address
                        }`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.aElementStyle}
                      >
                        {validatorInfo!.description.moniker}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '1.4rem' }}>
                    {times(validatorInfo!.tokens, pow(10, -currentChain.decimal), 0)}
                    <br />({times(divide(validatorInfo!.tokens, validValidatorsTotalToken), '100', 2)}%)
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '1.4rem' }}>
                    {times(validatorInfo!.commission.commission_rates.rate, '100', 2)}%
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: '1.4rem' }}>
                    {times(item.balance.amount, pow(10, -currentChain.decimal), currentChain.decimal)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: '1.4rem' }}>
                    {times(
                      rewardInfo?.reward?.reduce((ac, cu) => ac.plus(cu.amount), new Big('0')).toString() || '0',
                      pow(10, -currentChain.decimal),
                      currentChain.decimal,
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: '1.4rem' }}>
                    <div className={styles.buttonContainer}>
                      <Button
                        onClick={() => {
                          setDelegationData({
                            open: true,
                            inputData: { type: 'delegate', validatorAddress: validatorInfo!.operator_address },
                          });
                        }}
                      >
                        위임
                      </Button>
                      <Button
                        onClick={() => {
                          setDelegationData({
                            open: true,
                            inputData: { type: 'undelegate', validatorAddress: validatorInfo!.operator_address },
                          });
                        }}
                      >
                        위임 철회
                      </Button>
                      <Button
                        onClick={() => {
                          setValidatorListData({ open: true, validatorAddress: validatorInfo!.operator_address });
                          setDelegationData({
                            open: false,
                            inputData: {
                              type: 'redelegate',
                              validatorSrcAddress: validatorInfo!.operator_address,
                              validatorDstAddress: '',
                            },
                          });
                        }}
                      >
                        재위임
                      </Button>
                      <Button
                        onClick={() => {
                          const rewardAmount = getRewardAmount([validatorInfo!.operator_address]);

                          if (gt(currentChain.fee.default, rewardAmount)) {
                            enqueueSnackbar('요청할 이자가 Tx 수수료보다 낮습니다.', { variant: 'error' });
                            return;
                          }

                          setWithdrawRewardData({
                            open: true,
                            validatorAddress: [validatorInfo!.operator_address],
                            amount: rewardAmount,
                            title: '이자 받기',
                          });
                        }}
                      >
                        이자 받기
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <DialogDelegation
        open={delegationData.open}
        inputData={delegationData.inputData}
        onClose={() => setDelegationData((prev) => ({ ...prev, open: false }))}
      />
      <DialogWithdrawReward
        {...withdrawRewardData}
        onClose={() => {
          setWithdrawRewardData((prev) => ({ ...prev, open: false }));
        }}
      />
      <DialogValidatorList
        open={validatorListData.open}
        validatorAddress={validatorListData.validatorAddress}
        onClose={() => setValidatorListData((prev) => ({ ...prev, open: false }))}
        onClick={(validator) => {
          setTimeout(() => {
            setDelegationData((prev) => ({
              open: true,
              inputData: { ...prev.inputData, validatorDstAddress: validator },
            }));
          }, 200);
        }}
        title="재위임"
        description="재위임할 검증인을 선택해주세요."
      />
    </div>
  );
}
