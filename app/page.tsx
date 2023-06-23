"use client";

import { useState, ChangeEvent, useEffect, useRef } from "react";

function useThrottle<T>(value: T, interval = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + interval) {
      lastExecuted.current = Date.now();
      setThrottledValue(value);
    } else {
      const timerId = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval);

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}

const COINS_LIST_API = "https://api.coingecko.com/api/v3/coins/list";
const VS_CURRENCIES_API =
  "https://api.coingecko.com/api/v3/simple/supported_vs_currencies";
const PRICES_API = "https://api.coingecko.com/api/v3/simple/price";

const DEFAULT_FROM = [
  {
    id: "01coin",
    symbol: "zoc",
    name: "01coin",
  },
  {
    id: "dogecoin",
    symbol: "doge",
    name: "Dogecoin",
  },
  {
    id: "binance-bitcoin",
    symbol: "btcb",
    name: "Binance Bitcoin",
  },
  {
    id: "usd-coin",
    symbol: "usdc",
    name: "USD Coin",
  },
];

const DEFAULT_TO = ["btc", "eth", "ltc", "bch", "bnb", "eos"];

type Coin = {
  id: string;
  symbol: string;
  name: string;
};

export default function Home() {
  const [coinsList, setCoinsList] = useState<Coin[]>(DEFAULT_FROM);
  const [vsCurrencies, setVsCurrencies] = useState<string[]>(DEFAULT_TO);
  const [loadingCurrencies, setLoadingCurrencies] = useState<boolean>(false);

  const [fromCurrency, setFromCurrency] = useState<string>("01coin");
  const [toCurrency, setToCurrency] = useState<string>("btc");
  const [amount, setAmount] = useState<number>(0);

  const throttledAmount = useThrottle<number>(amount);

  const [conversionResult, setConversionResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [priceData, setPriceData] = useState<any | null>(null);

  useEffect(() => {
    const fetchTodayPrices = async () => {
      try {
        const response = await fetch(
          `${PRICES_API}?ids=bitcoin,ethereum,litecoin&vs_currencies=usd,eur,gbp`
        );
        const data = await response.json();
        setPriceData(data);
        console.log(data);
      } catch (error) {
        setError(
          "Error occurred while fetching prices. Please try again later."
        );
      }
    };

    fetchTodayPrices();

    const intervalId = setInterval(fetchTodayPrices, 60 * 5 * 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingCurrencies(true);
        const [coinsListRes, vsCurrenciesRes] = await Promise.all([
          fetch(COINS_LIST_API),
          fetch(VS_CURRENCIES_API),
        ]);
        const [coinsListData, vsCurrenciesData] = await Promise.all([
          coinsListRes.json(),
          vsCurrenciesRes.json(),
        ]);
        setCoinsList(coinsListData);
        setVsCurrencies(vsCurrenciesData);
      } catch (error) {
        console.log(
          "Error occurred during loading currencies. Used default values."
        );
        setCoinsList(DEFAULT_FROM);
        setVsCurrencies(DEFAULT_TO);
      } finally {
        setLoadingCurrencies(false);
      }
    })();
  }, []);

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(event.target.value));
  };

  const handleFromCurrencyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFromCurrency(event.target.value);
  };

  const handleToCurrencyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setToCurrency(event.target.value);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${PRICES_API}?ids=${fromCurrency}&vs_currencies=${toCurrency}`
        );
        const data = await response.json();
        const convertedAmount =
          throttledAmount * Number(data[fromCurrency][toCurrency]);
        setConversionResult(convertedAmount);
        setError(null);
      } catch (error) {
        setError("Error occurred during conversion. Please try again later.");
        setConversionResult(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [throttledAmount, fromCurrency, toCurrency]);

  return (
    <div className="flex flex-col items-center mt-8">
      <h1 className="text-2xl font-bold mb-4">Cryptocurrency Converter</h1>
      <h3 className="text-gray-500 mb-4">
        Powered by{" "}
        <a className="font-bold" href="https://www.coingecko.com">
          CoinGecko
        </a>
      </h3>
      <div className="flex flex-wrap justify-center items-center space-x-2">
        <input
          type="number"
          placeholder="Amount"
          className="w-48 h-10 border border-gray-300"
          value={amount}
          min={0}
          onChange={handleAmountChange}
          readOnly={loadingCurrencies}
        />
        <select
          className="w-48 max-w-[40%] h-10 border border-gray-300"
          value={fromCurrency}
          onChange={handleFromCurrencyChange}
        >
          {coinsList.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <span className="font-bold">to</span>
        <select
          className="w-48 max-w-[40%] h-10 border border-gray-300"
          value={toCurrency}
          onChange={handleToCurrencyChange}
        >
          {vsCurrencies.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      {loading && <p className="mt-4">Loading...</p>}
      {!loading && typeof conversionResult === "number" && (
        <p className="mt-4 font-bold text-lg">
          {throttledAmount} {fromCurrency} = {conversionResult} {toCurrency}
        </p>
      )}
      {error && !loading && <p className="text-red-500 mt-4">{error}</p>}

      <h2 className="text-xl font-bold mt-8">
        Today&apos;s Popular Cryptocurrency Prices
      </h2>
      {priceData ? (
        <table className="border-collapse border border-gray-300 mt-4">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Currency</th>
              <th className="border border-gray-300 p-2">USD</th>
              <th className="border border-gray-300 p-2">EUR</th>
              <th className="border border-gray-300 p-2">GBP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2">Bitcoin</td>
              <td className="border border-gray-300 p-2">
                ${priceData.bitcoin.usd}
              </td>
              <td className="border border-gray-300 p-2">
                €{priceData.bitcoin.eur}
              </td>
              <td className="border border-gray-300 p-2">
                £{priceData.bitcoin.gbp}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2">Ethereum</td>
              <td className="border border-gray-300 p-2">
                ${priceData.ethereum.usd}
              </td>
              <td className="border border-gray-300 p-2">
                €{priceData.ethereum.eur}
              </td>
              <td className="border border-gray-300 p-2">
                £{priceData.ethereum.gbp}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2">Litecoin</td>
              <td className="border border-gray-300 p-2">
                ${priceData.litecoin.usd}
              </td>
              <td className="border border-gray-300 p-2">
                €{priceData.litecoin.eur}
              </td>
              <td className="border border-gray-300 p-2">
                £{priceData.litecoin.gbp}
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="mt-4">Fetching prices...</p>
      )}
    </div>
  );
}
