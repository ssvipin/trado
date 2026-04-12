import React from 'react'
import { Label } from '../ui/label'
import { cn } from '@/lib/utils'
import { Input } from '../ui/input'

const InputField = ({ name, label, placeholder, register, error, validation, type="text", disabled, value }: FormInputProps) => {
  return (
    <div className='space-y-2'>
        <Label htmlFor={name} className='form-label'>
            {label}
        </Label>
        <Input 
        type={type}
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        defaultValue={value}
        {...register(name, validation)}
        className={cn('form-input',{'opacity-50 cursor-not-allowed': disabled})}
        />
        {error && <p className='text-red-500 text-sm'>{error.message}</p>}
    </div>
  )
}

export default InputField