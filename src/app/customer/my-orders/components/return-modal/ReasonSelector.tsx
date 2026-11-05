import type { FC } from 'react';
import { RETURN_REASONS } from '../../constants';

interface ReasonSelectorProps {
  selectedReason: string;
  onSelectReason: (reason: string) => void;
  requestType?: 'return' | 'refund';
  onSelectRequestType?: (t: 'return' | 'refund') => void;
  onNext: () => void;
}

const REQUEST_TYPES: { value: 'return' | 'refund'; label: string }[] = [
  { value: 'return', label: 'Return / replacement' },
  { value: 'refund', label: 'Refund' },
];

const ReasonSelector: FC<ReasonSelectorProps> = ({
  selectedReason,
  onSelectReason,
  requestType = 'return',
  onSelectRequestType,
  onNext,
}) => {
  return (
    <div className="h-full flex flex-col justify-between">
      <div>
        {onSelectRequestType && (
          <div className="mb-5">
            <p className="text-gray-700 text-sm font-medium mb-3">What would you like?</p>
            <div className="flex flex-wrap gap-4">
              {REQUEST_TYPES.map((t) => (
                <label key={t.value} className="flex items-center text-gray-700 font-medium">
                  <input
                    type="radio"
                    name="request-type"
                    value={t.value}
                    checked={requestType === t.value}
                    onChange={() => onSelectRequestType(t.value)}
                    className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                  />
                  <span className="ml-2">{t.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <p className="text-gray-700 text-sm font-medium mb-3">
          Why are you returning this item?
        </p>
        <fieldset className="space-y-4">
          {RETURN_REASONS.map((reason, index) => (
            <div key={index} className="flex items-center">
              <input
                id={`return-reason-${index}`}
                name="return-reason"
                type="radio"
                value={reason}
                checked={selectedReason === reason}
                onChange={() => onSelectReason(reason)}
                className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
              />
              <label
                htmlFor={`return-reason-${index}`}
                className="ml-3 block text-gray-700 font-medium"
              >
                {reason}
              </label>
            </div>
          ))}
        </fieldset>
      </div>
      <div className="flex justify-start md:justify-end mt-6">
        <button
          type="button"
          className={`bg-primary text-white py-2 px-6 rounded-md cursor-pointer hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 ${
            selectedReason ? '' : 'opacity-50 cursor-not-allowed'
          }`}
          onClick={onNext}
          disabled={!selectedReason}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ReasonSelector;
