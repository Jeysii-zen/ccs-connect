<?php

namespace App\Http\Requests\Auth;

use App\Services\AuthenticationService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request using CCS Connect authentication rules.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $authenticationService = app(AuthenticationService::class);

        $user = $authenticationService->authenticate(
            $this->string('email')->toString(),
            $this->string('password')->toString()
        );

        $this->attributes->set('authenticated_user', $user);
    }

    /**
     * Get the authenticated user produced by the authentication service.
     */
    public function authenticatedUser()
    {
        return $this->attributes->get('authenticated_user');
    }
}